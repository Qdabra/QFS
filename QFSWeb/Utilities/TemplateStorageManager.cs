using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using InfoPathServices;
using Microsoft.WindowsAzure.Storage.Table;
using QFSWeb.Models;
using System.Text;
using QFSWeb.Interface;

namespace QFSWeb.Utilities
{
    public class TemplateStorageManager
    {
        #region Retrieving records
        public static CloudTable GetTemplatesTable()
        {
            return StorageHelper.GetTable(ApplicationConstants.AzureStorage.TableTemplates);
        }

        public static CloudTable GetTemplateInstancesTable()
        {
            return StorageHelper.GetTable(ApplicationConstants.AzureStorage.TableTemplateInstances);
        }

        private static TableQuery<T> QueryTable<T>(CloudTable table, string partitionKey, string rowKey)
        {
            return new TableQuery<T>()
                .Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, partitionKey))
                .Where(TableQuery.GenerateFilterCondition("RowKey", QueryComparisons.Equal, rowKey));
        }

        private static T QueryRecord<T>(CloudTable table, string partitionKey, string rowKey) where T : ITableEntity, new()
        {
            if (!table.Exists())
            {
                return default(T);
            }

            var query = QueryTable<T>(table, partitionKey, rowKey);

            return table.ExecuteQuery(query).FirstOrDefault();
        }

        public static FormTemplateEntity GetTemplateRecord(string userKey, string templateName)
        {
            var partitionKey = userKey.ToLowerInvariant();

            var rowKey = FormTemplateEntity.NormalizeName(templateName);

            return QueryRecord<FormTemplateEntity>(GetTemplatesTable(), partitionKey, rowKey);
        }

        public static FormTemplateInstanceEntity GetInstanceRecord(string templateId, string instanceId)
        {
            return QueryRecord<FormTemplateInstanceEntity>(GetTemplateInstancesTable(), templateId, instanceId);
        }

        private static IEnumerable<T> QueryRecords<T>(CloudTable table, string partitionKey) where T : ITableEntity, new()
        {
            if (!table.Exists())
            {
                return new T[0];
            }

            var query = new TableQuery<T>()
                .Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, partitionKey));

            return table.ExecuteQuery(query);
        }

        public IEnumerable<FormTemplateViewModel> ListTemplates(string userKey)
        {
            var partitionKey = userKey.ToLowerInvariant();

            var table = GetTemplatesTable();

            var formTemplateEntity = QueryRecords<FormTemplateEntity>(table, partitionKey);

            return formTemplateEntity.Select(formTemplate => new FormTemplateViewModel()
            {
                CurrentInstanceId = formTemplate.CurrentInstanceId,
                CurrentVersion = formTemplate.CurrentVersion,
                UserKey = formTemplate.PartitionKey,
                TemplateId = formTemplate.TemplateId,
                TemplateName = formTemplate.TemplateName
            }).ToList();
        }

        //public static IEnumerable<FormTemplateEntity> ListTemplates(string userKey)
        //{
        //    var partitionKey = userKey.ToLowerInvariant();

        //    var table = GetTemplatesTable();

        //    return QueryRecords<FormTemplateEntity>(table, partitionKey);
        //}

        public static IEnumerable<FormTemplateInstanceEntity> ListInstances(string templateId)
        {
            return QueryRecords<FormTemplateInstanceEntity>(GetTemplateInstancesTable(), templateId);
        }
        #endregion

        private static string GetUserKey()
        {
            return SpManager.GetRealm();
        }

        public async Task<Tuple<bool, string, string>> StoreTemplate(string userKey, string templateName, bool createNew, Stream templateStream, string xsnFileName, bool allowDowngrade)
        {
            string oldVersion = null;
            bool canUpload = true;

            var existingRecord = GetTemplateRecord(userKey, templateName);

            if (createNew && existingRecord != null)
            {
                throw new Exception("There is already a template with the name " + templateName);
            }

            try
            {
                var workingName = InfoPathServices.Utilities.GenerateWorkingName();
                var templateFilePath = InfoPathServices.Utilities.GenerateTemplateFilePath(workingName);

                InfoPathServices.Utilities.SaveStreamToFile(templateFilePath, templateStream);

                using (var xsn = new XsnWrapper(templateFilePath))
                {
                    var uploadDate = DateTime.UtcNow;

                    var version = xsn.Manifest.GetSolutionVersion().Value;

                    if (!allowDowngrade)
                    {
                        ValidateVersion(version, existingRecord, out oldVersion, out canUpload);

                        if (!canUpload)
                        {
                            return new Tuple<bool, string, string>(canUpload, oldVersion, version);
                        }
                    }

                    var templateId = existingRecord == null ? Guid.NewGuid().ToString("D") : existingRecord.TemplateId;
                    var instanceId = Guid.NewGuid().ToString("D");

                    await UploadFiles(xsn, instanceId);

                    await AddRecords(userKey, uploadDate, templateName, version, templateId, instanceId, xsn.ManifestFileName, xsn.TemplateFileName, xsnFileName);

                    await DeleteOldInstances(templateId, instanceId, uploadDate);

                    return new Tuple<bool, string, string>(canUpload, oldVersion, version);
                }
            }
            finally
            {

            }
        }

        private static async Task DeleteOldInstances(string templateId, string instanceId, DateTime uploadDate)
        {
            var records = ListInstances(templateId).Where(i => i.RowKey != instanceId && i.Uploaded < uploadDate);

            foreach (var record in records)
            {
                await DeleteInstance(record);
            }
        }

        public static async Task DeleteInstance(FormTemplateInstanceEntity instance)
        {
            await StorageHelper.DeleteContainer(instance.RowKey);

            var table = GetTemplateInstancesTable();

            await table.ExecuteAsync(TableOperation.Delete(instance));
        }

        private static async Task AddRecords(string userKey, DateTime uploadDate, string templateName, string version, string templateId, string currentInstanceId, string manifestFileName, string templateFileName, string originalFileName)
        {
            var table = GetTemplatesTable();

            await table.CreateIfNotExistsAsync();

            var templateEntity = new FormTemplateEntity(userKey, templateName)
            {
                TemplateId = templateId,
                CurrentInstanceId = currentInstanceId,
                CurrentVersion = version
            };

            var tableOperation = TableOperation.InsertOrReplace(templateEntity);

            await table.ExecuteAsync(tableOperation);



            var instancesTable = GetTemplateInstancesTable();

            await instancesTable.CreateIfNotExistsAsync();

            var instanceEntity = new FormTemplateInstanceEntity(templateId, currentInstanceId)
            {
                Version = version,
                Uploaded = uploadDate,
                ManifestFileName = manifestFileName,
                TemplateFileName = templateFileName,
                XsnOrginalFileName = originalFileName
            };

            var instanceOperation = TableOperation.InsertOrReplace(instanceEntity);

            await instancesTable.ExecuteAsync(instanceOperation);
        }

        private static async Task UploadFiles(XsnWrapper xsn, string itemId)
        {
            foreach (var file in xsn.XsnContents)
            {
                using (var fStream = File.OpenRead(file))
                {
                    await StorageHelper.UploadFile(itemId, fStream, Path.GetFileName(file));
                }
            }
        }

        private static void ValidateVersion(string version, FormTemplateEntity existingRecord, out string oldVersion, out bool canUpload)
        {
            canUpload = true;
            oldVersion = null;

            if (existingRecord == null)
            {
                return;
            }

            var versionObj = new Version(version);

            var currentVersion = new Version(existingRecord.CurrentVersion);
            oldVersion = existingRecord.CurrentVersion;

            if ((versionObj == currentVersion)
                || (versionObj < currentVersion))
            {
                canUpload = false;
            }
        }

        internal static async Task<BlobFileInfo> GetTemplateFile(string instanceId, string fileName)
        {
            return await StorageHelper.GetFileAsync(instanceId, fileName);
        }

        public async Task<BlobFileInfo> GetTemplateFileWithCheck(string userId, string templateName, string instanceId, string fileName)
        {
            ValidateAccess(userId, templateName, instanceId);

            return await GetTemplateFile(instanceId, fileName);
        }

        private static void ValidateAccess(string userId, string templateName, string instanceId)
        {
            var templateRecord = GetAndCheckTemplateRecord(userId, templateName);

            var instanceRecord = GetInstanceRecord(templateRecord.TemplateId, instanceId);

            if (instanceRecord == null)
            {
                throw new Exception("Invalid instance id: " + instanceId);
            }
        }

        private static FormTemplateEntity GetAndCheckTemplateRecord(string userId, string templateName)
        {
            // validate that user can access the specified template and instance
            var templateRecord = GetTemplateRecord(userId, templateName);

            if (templateRecord == null)
            {
                throw new Exception("Template not found: " + templateName);
            }
            return templateRecord;
        }

        /// <summary>
        /// Method to delete template table entity.
        /// </summary>
        /// <param name="template">Entity to delete.</param>
        /// <returns></returns>
        public static async Task DeleteTemplateEntity(FormTemplateEntity template)
        {
            if (template == null)
            {
                return;
            }

            var templateTable = GetTemplatesTable();
            if (templateTable == null)
            {
                return;
            }

            await templateTable.ExecuteAsync(TableOperation.Delete(template));
        }

        private static async Task<string> GetFileContents(Stream stream)
        {
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                return await reader.ReadToEndAsync();
            }
        }

        public async Task<ManifestFileWithProperties> GetManifestForTemplateName(string templateName)
        {

            var templateRecord = GetTemplateRecord(templateName);

            if (templateRecord == null)
            {
                return null;
            }

            var instanceId = templateRecord.CurrentInstanceId;

            var instanceRecord = TemplateStorageManager.GetInstanceRecord(templateRecord.TemplateId, instanceId);

            if (instanceRecord == null)
            {
                return null;
            }

            var manifestFileName = instanceRecord.ManifestFileName;

            var manifestBlobInfo = await TemplateStorageManager.GetTemplateFile(instanceId, manifestFileName);

            var manifestContents = await GetFileContents(manifestBlobInfo.FileStream);

            var formProperties = new FormPropertyList();
            formProperties.Add("templateName", templateName);
            formProperties.Add("instanceId", instanceId);

            var manifest = new ManifestFileWithProperties(formProperties,
                new FormFile(manifestFileName, manifestContents));

            return manifest;
        }

        /// <summary>
        /// Method to download uploaded xsn file.
        /// </summary>
        /// <param name="templateName">Stored template name.</param>
        /// <returns></returns>
        public async Task<BlobFileInfo> GetXsnBlobInfo(string templateName)
        {
            var templateRecord = GetTemplateRecord(templateName);
            if (templateRecord == null)
            {
                return null;
            }

            var instanceId = templateRecord.CurrentInstanceId;

            var instanceRecord = TemplateStorageManager.GetInstanceRecord(templateRecord.TemplateId, instanceId);
            if (instanceRecord == null)
            {
                return null;
            }

            var templateFileName = instanceRecord.TemplateFileName;

            var manifestBlobInfo = await TemplateStorageManager.GetTemplateFile(instanceId, templateFileName);

            if (manifestBlobInfo != null)
            {
                manifestBlobInfo.FileName = instanceRecord.XsnOrginalFileName;
            }

            return manifestBlobInfo;
        }

        /// <summary>
        /// Method to delete template.
        /// </summary>
        /// <param name="templateName">Template name.</param>
        /// <returns></returns>
        public async Task<bool> DeleteTemplate(string templateName)
        {
            try
            {
                var templateRecord = GetTemplateRecord(templateName);

                if (templateRecord == null)
                {
                    return false;
                }

                var instanceId = templateRecord.CurrentInstanceId;
                var instanceRecord = GetInstanceRecord(templateRecord.TemplateId, instanceId);

                if (instanceRecord == null)
                {
                    return false;
                }

                await DeleteInstance(instanceRecord);
                await DeleteTemplateEntity(templateRecord);

                return true;
            }
            catch
            {
                return false;
            }

        }

        /// <summary>
        /// Method to get template record for template name
        /// </summary>
        /// <param name="templateName">Template name.</param>
        /// <returns></returns>
        private static FormTemplateEntity GetTemplateRecord(string templateName)
        {
            var userId = GetUserKey();

            var templateRecord = GetTemplateRecord(userId, templateName);

            if (templateRecord == null)
            {
                return null;
            }

            return templateRecord;
        }
    }
}