using InfoPathServices;
using QFSWeb.Encryption;
using QFSWeb.Interface;
using QFSWeb.Models;
using QFSWeb.Models.SQLModels;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace QFSWeb.Utilities
{
    public class SQLTemplateStorageManager
    {
        private const string QFSConnectionString = "QFSConnectionString";

        public static bool EnableLimiting
        {
            get { return (ConnectionString != null); }
        }

        public static string ConnectionString
        {
            get
            {
                var qfsConnectionString = ConfigurationManager.ConnectionStrings[QFSConnectionString];

                return qfsConnectionString == null ? null : qfsConnectionString.ConnectionString;
            }
        }

        #region Retrieving records

        public static async Task<FormTemplateModel> GetTemplateRecord(string userKey, string templateName)
        {
            var location = GetCurrentLocation();

            userKey = userKey.ToLowerInvariant();

            templateName = FormTemplateModel.NormalizeName(templateName);

            FormTemplateModel formTemplate = new FormTemplateModel();

            var queryBuilder = new StringBuilder("SELECT * FROM Templates ");
            queryBuilder.Append("WHERE UserKey = @UserKey ");
            queryBuilder.Append("AND RowKeyTemplate = @RowKeyTemplate ");
            queryBuilder.Append("AND (Location IS NULL OR Location = @Location)");

            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand(queryBuilder.ToString(), sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@UserKey", SqlDbType.VarChar).Value = userKey;
                        sqlCommand.Parameters.AddWithValue("@RowKeyTemplate", SqlDbType.VarChar).Value = templateName;
                        sqlCommand.Parameters.AddWithValue("@Location", location);

                        await sqlConnection.OpenAsync();

                        using (SqlDataReader reader = await sqlCommand.ExecuteReaderAsync())
                        {
                            if (!reader.Read())
                            {
                                return null;
                            }

                            formTemplate.ID = Convert.ToInt32(reader["ID"]);
                            formTemplate.CurrentInstanceId = Convert.ToString(reader["CurrentInstanceId"]);
                            formTemplate.CurrentVersion = Convert.ToString(reader["CurrentVersion"]);
                            formTemplate.TemplateId = Convert.ToString(reader["TemplateId"]);
                            formTemplate.TemplateName = Convert.ToString(reader["TemplateName"]);
                            formTemplate.UserKey = Convert.ToString(reader["UserKey"]);
                            formTemplate.RowKeyTemplate = Convert.ToString(reader["RowKeyTemplate"]);
                            formTemplate.Uploaded = (reader["Uploaded"] == System.DBNull.Value)
                                    ? (DateTime?)null
                                    : Convert.ToDateTime(reader["Uploaded"]);
                            formTemplate.LastModifiedBy = (reader["LastModifiedBy"] == System.DBNull.Value)
                                    ? ""
                                    : Convert.ToString(reader["LastModifiedBy"]);
                        }
                    }
                }
            }
            catch { }

            return formTemplate;
        }

        public static async Task<FormTemplateInstanceModel> GetInstanceRecord(string templateId, string instanceId)
        {
            FormTemplateInstanceModel formTemplateInstance = new FormTemplateInstanceModel();

            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand("SELECT * FROM TemplateInstances WHERE TemplateId = @TemplateId and CurrentInstanceId = @CurrentInstanceId", sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@TemplateId", SqlDbType.VarChar).Value = templateId;
                        sqlCommand.Parameters.AddWithValue("@CurrentInstanceId", SqlDbType.VarChar).Value = instanceId;

                        await sqlConnection.OpenAsync();

                        using (SqlDataReader reader = await sqlCommand.ExecuteReaderAsync())
                        {
                            if (!reader.Read())
                                return null;

                            formTemplateInstance.ID = Convert.ToInt32(reader["ID"]);
                            formTemplateInstance.InstanceId = Convert.ToString(reader["CurrentInstanceId"]);
                            formTemplateInstance.ManifestFileName = Convert.ToString(reader["ManifestFileName"]);
                            formTemplateInstance.TemplateFileName = Convert.ToString(reader["TemplateFileName"]);
                            formTemplateInstance.TemplateId = Convert.ToString(reader["TemplateId"]);
                            formTemplateInstance.Uploaded = Convert.ToDateTime(reader["Uploaded"]);
                            formTemplateInstance.Version = Convert.ToString(reader["TemplateVersion"]);
                            formTemplateInstance.XsnOrginalFileName = Convert.ToString(reader["XsnOrginalFileName"]);
                        }
                    }
                }
            }
            catch { }

            return formTemplateInstance;
        }

        private static async Task PerformSqlAction(string query, Func<SqlCommand, Task> action, IEnumerable<SqlParameter> parameters = null, string overrideConnString = null)
        {
            using (var sqlConnection = new SqlConnection(overrideConnString ?? ConnectionString))
            {
                using (var sqlCommand = new SqlCommand(query, sqlConnection))
                {
                    if (parameters != null)
                    {
                        foreach (var p in parameters)
                        {
                            sqlCommand.Parameters.Add(p);
                        }
                    }

                    await sqlConnection.OpenAsync();

                    await action(sqlCommand);

                    sqlConnection.Close();
                }
            }
        }

        private static async Task<IEnumerable<T>> PerformQuery<T>(string query, Func<SqlDataReader, T> readLine, IEnumerable<SqlParameter> parameters = null, string overrideConnString = null)
        {
            var results = new List<T>();

            await PerformSqlAction(query, async comm =>
            {
                using (var reader = await comm.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        results.Add(readLine(reader));
                    }
                }
            }, parameters, overrideConnString);

            return results;
        }

        private static async Task PerformNonQuery(string query, IEnumerable<SqlParameter> parameters = null)
        {
            await PerformSqlAction(query, comm => comm.ExecuteNonQueryAsync(), parameters);
        }

        private static async Task<object> PerformScalarQuery(string query, IEnumerable<SqlParameter> parameters = null)
        {
            object result = null;

            await PerformSqlAction(query, async comm => result = await comm.ExecuteScalarAsync(), parameters);

            return result;
        }

        public static async Task<IEnumerable<HrefAssociation>> ListHrefAssociations(string userKey)
        {
            var p = new SqlParameter("@userKey", SqlDbType.NVarChar, 255)
            {
                Value = userKey
            };

            return await PerformQuery("SELECT Href, TemplateId FROM HrefAssociation WHERE UserKey = @userKey", reader => new HrefAssociation
            {
                Href = Convert.ToString(reader["Href"]),
                TemplateId = Convert.ToString(reader["TemplateId"])
            }, new[] { p });
        }

        public static async Task<IEnumerable<FormTemplateViewModel>> GetTemplatesAsync(string userKey)
        {
            var dateTime = DateTime.UtcNow;
            var location = GetCurrentLocation();
            var userKeyParam = new SqlParameter("@userKey", SqlDbType.NVarChar, 255)
            {
                Value = userKey
            };
            var locationParam = new SqlParameter("@Location", SqlDbType.NVarChar, 255)
            {
                Value = location
            };
            var paramMonth = new SqlParameter("@Month", SqlDbType.Int)
            {
                Value = dateTime.Month
            };
            var paramYear = new SqlParameter("@Year", SqlDbType.Int)
            {
                Value = dateTime.Year
            };

            var queryBuilder = new StringBuilder("SELECT t.*, ");
            queryBuilder.Append("ISNULL(");
            queryBuilder.Append("(SELECT TOP 1 Opens FROM MonthlyTemplateAccess mta ");
            queryBuilder.Append("WHERE mta.TemplateId = t.TemplateId ");
            queryBuilder.Append("AND mta.Month = @Month ");
            queryBuilder.Append("AND mta.Year = @Year");
            queryBuilder.Append("),0) AS MonthlyOpens ");
            queryBuilder.Append("FROM Templates t ");
            queryBuilder.Append("WHERE t.UserKey = @UserKey ");
            queryBuilder.Append("AND (t.Location IS NULL OR t.Location = @Location)");

            return await PerformQuery(queryBuilder.ToString(),
                reader =>
                    new FormTemplateViewModel(reader),
                    new[] { userKeyParam, locationParam, paramMonth, paramYear });
        }

        public static async Task<IEnumerable<FormTemplateInstanceModel>> ListInstances(string templateId)
        {
            List<FormTemplateInstanceModel> formTemplateInstances = new List<FormTemplateInstanceModel>();

            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand("SELECT * FROM TemplateInstances WHERE TemplateId = @TemplateId", sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@TemplateId", SqlDbType.VarChar).Value = templateId;

                        await sqlConnection.OpenAsync();

                        using (SqlDataReader reader = await sqlCommand.ExecuteReaderAsync())
                        {
                            if (!reader.HasRows)
                                return null;

                            while (reader.Read())
                            {
                                FormTemplateInstanceModel formTemplateInstance = new FormTemplateInstanceModel
                                {
                                    ID = Convert.ToInt32(reader["ID"]),
                                    InstanceId = Convert.ToString(reader["CurrentInstanceId"]),
                                    ManifestFileName = Convert.ToString(reader["ManifestFileName"]),
                                    TemplateFileName = Convert.ToString(reader["TemplateFileName"]),
                                    TemplateId = Convert.ToString(reader["TemplateId"]),
                                    Uploaded = Convert.ToDateTime(reader["Uploaded"]),
                                    Version = Convert.ToString(reader["TemplateVersion"]),
                                    XsnOrginalFileName = Convert.ToString(reader["XsnOrginalFileName"]),
                                };
                                formTemplateInstances.Add(formTemplateInstance);
                            }
                        }
                    }
                }
            }
            catch { }

            return formTemplateInstances;
        }
        #endregion

        private static string GetUserKey()
        {
            return SpManager.GetRealm();
        }

        /// <summary>
        /// Method to return the formatted SPHostUrl
        /// </summary>
        /// <returns></returns>
        private static string GetCurrentLocation()
        {
            var spHostUrl = SpManager.GetSpHost();

            return QfsUtility.FormatLocation(spHostUrl);
        }

        private static string ProdConnString = "";

        //private static string ProdConnString = null;

        public static async Task<Tuple<bool, string, string>> StoreTemplate(string userKey, string templateName, bool createNew, Stream templateStream,
            string xsnFileName, bool allowDowngrade, IStorageHelper storageContext, string lastModifiedBy, string location)
        {
            string oldVersion = null;
            bool canUpload = true;

            var existingRecord = await GetTemplateRecord(userKey, templateName);

            if (createNew && (existingRecord != null))
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

                    await UploadFiles(xsn, instanceId, storageContext);

                    await AddRecords(userKey, uploadDate, templateName, version, templateId, instanceId,
                        xsn.ManifestFileName, xsn.TemplateFileName, xsnFileName, lastModifiedBy, location);

                    if (!createNew)
                    {
                        await DeleteOldInstances(templateId, instanceId, uploadDate, storageContext);
                    }

                    return new Tuple<bool, string, string>(canUpload, oldVersion, version);
                }
            }
            finally
            {

            }
        }

        private static async Task DeleteOldInstances(string templateId, string instanceId, DateTime uploadDate, IStorageHelper storageContext)
        {
            var records = await ListInstances(templateId);
            if (records == null)
            {
                return;
            }

            records = records.Where(i => i.InstanceId != instanceId && i.Uploaded < uploadDate);

            foreach (var record in records)
            {
                await DeleteInstance(record, storageContext);
            }
        }

        public static async Task DeleteInstance(FormTemplateInstanceModel instance, IStorageHelper storageContext)
        {
            await storageContext.DeleteContainer(instance.InstanceId);

            var commandText = "DELETE FROM TemplateInstances WHERE TemplateId = @TemplateId AND CurrentInstanceId = @CurrentInstanceId";

            var sqlCommand = new SqlCommand(commandText);
            sqlCommand.Parameters.AddWithValue("@TemplateId", SqlDbType.VarChar).Value = instance.TemplateId;
            sqlCommand.Parameters.AddWithValue("@CurrentInstanceId", SqlDbType.VarChar).Value = instance.InstanceId;

            await InsertUpdateData(sqlCommand);
        }

        private static async Task AddRecords(string userKey, DateTime uploadDate, string templateName, string version, string templateId,
            string currentInstanceId, string manifestFileName, string templateFileName, string originalFileName, string lastModifiedBy, string location)
        {
            try
            {
                // Add the new instance first
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    var commandText =
                        await GetInsertUpdateTemplateInstanceQuery(sqlConnection, templateId, currentInstanceId);

                    await
                        InsertUpdateTemplateInstanceAsync(uploadDate, version, templateId, currentInstanceId,
                            manifestFileName,
                            templateFileName, originalFileName, sqlConnection, commandText);
                }

                // Update or add the template
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    var insertUpdateQuery =
                        await GetInsertUpdateTemplateQuery(sqlConnection, userKey, templateName, location);

                    await InsertUpdateTemplateAsync(sqlConnection, insertUpdateQuery, userKey, uploadDate, templateName,
                        version, templateId, currentInstanceId, lastModifiedBy, location);
                }
            }
            catch (Exception e)
            {
                throw new ApplicationException("An error occurred trying to save the template: " + e.Message);
            }
        }

        private static async Task<string> GetInsertUpdateTemplateQuery(SqlConnection sqlConnection, string userKey, string templateName, string location)
        {
            var cmdBuilder = new StringBuilder("SELECT * FROM Templates ");
            cmdBuilder.Append("WHERE UserKey = @UserKey ");
            cmdBuilder.Append("AND RowKeyTemplate = @RowKeyTemplate ");
            cmdBuilder.Append("AND (Location IS NULL OR Location = @Location)");

            var isExisting = false;

            using (var sqlCommand = new SqlCommand(cmdBuilder.ToString(), sqlConnection))
            {
                sqlCommand.Parameters.AddWithValue("@UserKey", userKey);
                sqlCommand.Parameters.AddWithValue("@RowKeyTemplate", FormTemplateModel.NormalizeName(templateName));
                sqlCommand.Parameters.AddWithValue("@Location", location);

                await sqlConnection.OpenAsync();

                using (SqlDataReader reader = await sqlCommand.ExecuteReaderAsync())
                {
                    isExisting = reader.HasRows;
                }
            }

            cmdBuilder.Clear();
            if (isExisting)
            {
                cmdBuilder.Append("Update Templates SET ");
                cmdBuilder.Append("TemplateId = @TemplateId, ");
                cmdBuilder.Append("CurrentInstanceId = @CurrentInstanceId, ");
                cmdBuilder.Append("CurrentVersion = @CurrentVersion, ");
                cmdBuilder.Append("TemplateName = @TemplateName, ");
                cmdBuilder.Append("Uploaded = @Uploaded, ");
                cmdBuilder.Append("LastModifiedBy = @LastModifiedBy ");
                cmdBuilder.Append("WHERE UserKey = @UserKey ");
                cmdBuilder.Append("AND RowKeyTemplate = @RowKeyTemplate ");
                cmdBuilder.Append("AND (Location IS NULL OR Location = @Location)");
            }
            else
            {
                cmdBuilder.Append("INSERT INTO Templates ");
                cmdBuilder.Append("(UserKey, TemplateName, TemplateId, CurrentInstanceId, ");
                cmdBuilder.Append("CurrentVersion, RowKeyTemplate, Uploaded, LastModifiedBy, Location) ");
                cmdBuilder.Append("VALUES(@UserKey, @TemplateName, @TemplateId, @CurrentInstanceId, ");
                cmdBuilder.Append("@CurrentVersion, @RowKeyTemplate, @Uploaded, @LastModifiedBy, @Location)");
            }

            return cmdBuilder.ToString();
        }

        private static async Task InsertUpdateTemplateAsync(SqlConnection sqlConnection, string commandText, string userKey,
            DateTime uploadDate, string templateName, string version, string templateId, string currentInstanceId, string lastModifiedBy, string location)
        {
            using (var sqlCommandIOrU = new SqlCommand(commandText, sqlConnection))
            {
                sqlCommandIOrU.Parameters.AddWithValue("@UserKey", userKey);
                sqlCommandIOrU.Parameters.AddWithValue("@TemplateName", templateName);
                sqlCommandIOrU.Parameters.AddWithValue("@TemplateId", templateId);
                sqlCommandIOrU.Parameters.AddWithValue("@CurrentInstanceId", currentInstanceId);
                sqlCommandIOrU.Parameters.AddWithValue("@CurrentVersion", version);
                sqlCommandIOrU.Parameters.AddWithValue("@Uploaded", uploadDate);
                sqlCommandIOrU.Parameters.AddWithValue("@LastModifiedBy", lastModifiedBy);
                sqlCommandIOrU.Parameters.AddWithValue("@RowKeyTemplate", FormTemplateModel.NormalizeName(templateName));
                sqlCommandIOrU.Parameters.AddWithValue("@Location", location);

                var cmdResult = await sqlCommandIOrU.ExecuteNonQueryAsync();
            }
        }

        private static async Task<string> GetInsertUpdateTemplateInstanceQuery(SqlConnection sqlConnection, string templateId, string currentInstanceId)
        {
            var cmdBuilder = new StringBuilder("SELECT * FROM TemplateInstances WHERE TemplateId = @TemplateId AND CurrentInstanceId = @CurrentInstanceId");
            var isExisting = false;

            using (var sqlCommand = new SqlCommand(cmdBuilder.ToString(), sqlConnection))
            {
                sqlCommand.Parameters.AddWithValue("@TemplateId", templateId);
                sqlCommand.Parameters.AddWithValue("@CurrentInstanceId", currentInstanceId);

                await sqlConnection.OpenAsync();

                using (SqlDataReader reader = await sqlCommand.ExecuteReaderAsync())
                {
                    isExisting = reader.HasRows;
                }
            }

            cmdBuilder.Clear();
            if (isExisting)
            {
                cmdBuilder.Append("UPDATE TemplateInstances SET ");
                cmdBuilder.Append("TemplateVersion = @TemplateVersion, ");
                cmdBuilder.Append("Uploaded = @Uploaded, ");
                cmdBuilder.Append("ManifestFileName = @ManifestFileName, ");
                cmdBuilder.Append("TemplateFileName = @TemplateFileName, ");
                cmdBuilder.Append("XsnOrginalFileName = @XsnOrginalFileName ");
                cmdBuilder.Append("WHERE TemplateId = @TemplateId ");
                cmdBuilder.Append("AND CurrentInstanceId = @CurrentInstanceId");
            }
            else
            {
                cmdBuilder.Append("INSERT INTO TemplateInstances ");
                cmdBuilder.Append("VALUES(@TemplateId, @CurrentInstanceId, @TemplateVersion, @Uploaded, @ManifestFileName, @TemplateFileName, @XsnOrginalFileName)");
            }

            return cmdBuilder.ToString();
        }

        private static async Task InsertUpdateTemplateInstanceAsync(DateTime uploadDate, string version, string templateId, string currentInstanceId,
            string manifestFileName, string templateFileName, string originalFileName, SqlConnection sqlConnection, string commandText)
        {
            using (var sqlCommandIOrU = new SqlCommand(commandText, sqlConnection))
            {
                sqlCommandIOrU.Parameters.AddWithValue("@TemplateId", templateId);
                sqlCommandIOrU.Parameters.AddWithValue("@CurrentInstanceId", currentInstanceId);
                sqlCommandIOrU.Parameters.AddWithValue("@TemplateVersion", version);
                sqlCommandIOrU.Parameters.AddWithValue("@Uploaded", uploadDate);
                sqlCommandIOrU.Parameters.AddWithValue("@ManifestFileName", manifestFileName);
                sqlCommandIOrU.Parameters.AddWithValue("@TemplateFileName", templateFileName);
                sqlCommandIOrU.Parameters.AddWithValue("@XsnOrginalFileName", originalFileName);

                var cmdResult = await sqlCommandIOrU.ExecuteNonQueryAsync();
            }
        }

        private static async Task UploadFiles(XsnWrapper xsn, string itemId, IStorageHelper storageContext)
        {
            foreach (var file in xsn.XsnContents)
            {
                using (var fStream = File.OpenRead(file))
                {
                    await storageContext.UploadFile(itemId, fStream, Path.GetFileName(file));
                }
            }
        }

        private static void ValidateVersion(string version, FormTemplateModel existingRecord, out string oldVersion, out bool canUpload)
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

        internal static async Task<BlobFileInfo> GetTemplateFile(string instanceId, string fileName, IStorageHelper storageContext)
        {
            return await storageContext.GetFileAsync(instanceId, fileName);
        }

        public static async Task<BlobFileInfo> GetTemplateFileWithCheck(string userId, string templateName, string instanceId, string fileName, IStorageHelper storageContext)
        {
            await ValidateAccess(userId, templateName, instanceId);

            return await GetTemplateFile(instanceId, fileName, storageContext);
        }

        private static async Task ValidateAccess(string userId, string templateName, string instanceId)
        {
            var templateRecord = await GetAndCheckTemplateRecord(userId, templateName);

            var instanceRecord = await GetInstanceRecord(templateRecord.TemplateId, instanceId);

            if (instanceRecord == null)
            {
                throw new Exception("Invalid instance id: " + instanceId);
            }
        }

        private static async Task<FormTemplateModel> GetAndCheckTemplateRecord(string userId, string templateName)
        {
            // validate that user can access the specified template and instance
            var templateRecord = await GetTemplateRecord(userId, templateName);

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
        public static async Task DeleteTemplateEntity(string templateId)
        {
            if (String.IsNullOrWhiteSpace(templateId))
            {
                return;
            }

            var commandText = "DELETE FROM Templates WHERE TemplateId = @TemplateId";

            var sqlCommand = new SqlCommand(commandText);
            sqlCommand.Parameters.AddWithValue("@TemplateId", SqlDbType.VarChar).Value = templateId;

            await InsertUpdateData(sqlCommand);
        }

        private static async Task<string> GetFileContents(Stream stream)
        {
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                return await reader.ReadToEndAsync();
            }
        }

        public static async Task<ManifestFileWithProperties> GetManifestForTemplateName(string templateName, IStorageHelper storageContext)
        {
            var templateRecord = await GetTemplateRecord(templateName);

            if (templateRecord == null)
            {
                return null;
            }

            var instanceId = templateRecord.CurrentInstanceId;

            var instanceRecord = await GetInstanceRecord(templateRecord.TemplateId, instanceId);

            if (instanceRecord == null)
            {
                return null;
            }

            var manifestFileName = instanceRecord.ManifestFileName;

            var manifestBlobInfo = await GetTemplateFile(instanceId, manifestFileName, storageContext);

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
        public static async Task<BlobFileInfo> GetXsnBlobInfo(string templateName, IStorageHelper storageContext)
        {
            var templateRecord = await GetTemplateRecord(templateName);
            if (templateRecord == null)
            {
                return null;
            }

            var instanceId = templateRecord.CurrentInstanceId;

            var instanceRecord = await GetInstanceRecord(templateRecord.TemplateId, instanceId);
            if (instanceRecord == null)
            {
                return null;
            }

            var templateFileName = instanceRecord.TemplateFileName;

            var manifestBlobInfo = await GetTemplateFile(instanceId, templateFileName, storageContext);

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
        public static async Task<bool> DeleteTemplate(string templateName, IStorageHelper storageContext)
        {
            try
            {
                var templateRecord = await GetTemplateRecord(templateName);

                if (templateRecord == null)
                {
                    return false;
                }

                var instanceId = templateRecord.CurrentInstanceId;
                var instanceRecord = await GetInstanceRecord(templateRecord.TemplateId, instanceId);

                if (instanceRecord == null)
                {
                    return false;
                }

                await DeleteInstance(instanceRecord, storageContext);
                await DeleteTemplateEntity(templateRecord.TemplateId);
                await DeleteMonthlyTemplateAccessDataAsync(templateRecord.TemplateId);

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
        private static async Task<FormTemplateModel> GetTemplateRecord(string templateName)
        {
            var userId = GetUserKey();

            var templateRecord = await GetTemplateRecord(userId, templateName);

            if (templateRecord == null)
            {
                return null;
            }

            return templateRecord;
        }

        private static async Task InsertUpdateData(SqlCommand sqlCommand)
        {
            using (var sqlConnection = new SqlConnection(ConnectionString))
            {
                sqlCommand.CommandType = CommandType.Text;
                sqlCommand.Connection = sqlConnection;

                await sqlConnection.OpenAsync();

                var cmdResult = await sqlCommand.ExecuteNonQueryAsync();
            }
        }

        public static async Task SaveNewHrefAssociations(string userKey, IEnumerable<HrefAssociation> newHrefs)
        {
            foreach (var href in newHrefs)
            {
                await SaveNewHrefAssociation(userKey, href);
            }
        }

        private static async Task SaveNewHrefAssociation(string userKey, HrefAssociation href)
        {
            var pUserKey = new SqlParameter("@userKey", SqlDbType.NVarChar, 255) { Value = userKey };
            var pHref = new SqlParameter("@href", SqlDbType.NVarChar, 511) { Value = href.Href };
            var templateId = new SqlParameter("@templateId", SqlDbType.NVarChar, 255) { Value = href.TemplateId };


            await PerformNonQuery(
                "INSERT INTO HrefAssociation(UserKey, Href, TemplateId) VALUES (@userKey, @href, @templateId)",
                new[] { pUserKey, pHref, templateId }
                );
        }

        internal static async Task UpdateHrefAssociations(string userKey, IEnumerable<HrefAssociation> hrefs)
        {
            foreach (var href in hrefs)
            {
                await UpdateHrefAssociation(userKey, href);
            }
        }

        private static async Task UpdateHrefAssociation(string userKey, HrefAssociation href)
        {
            var pUserKey = new SqlParameter("@userKey", SqlDbType.NVarChar, 255) { Value = userKey };
            var pHref = new SqlParameter("@href", SqlDbType.NVarChar, 511) { Value = href.Href };
            var templateId = new SqlParameter("@templateId", SqlDbType.NVarChar, 255) { Value = href.TemplateId };


            await PerformNonQuery(
                "UPDATE HrefAssociation SET TemplateId = @templateId WHERE UserKey = @userKey and Href = @href",
                new[] { pUserKey, pHref, templateId }
                );
        }

        public static async Task<string> FindRedirectTemplateName(string userKey, string xsnUrl)
        {
            var pUserKey = new SqlParameter("@userKey", SqlDbType.NVarChar, 255) { Value = userKey };
            var pHref = new SqlParameter("@href", SqlDbType.NVarChar, 511) { Value = xsnUrl };

            var name = await PerformScalarQuery(
                    @"SELECT TOP 1 t.TemplateName 
                      FROM Templates t 
                           INNER JOIN HrefAssociation h ON t.UserKey = h.UserKey AND t.TemplateId = h.TemplateId
                      WHERE h.UserKey = @userKey AND h.Href = @href",
                    new[] { pUserKey, pHref });

            return name == null ? null : Convert.ToString(name);
        }

        /// <summary>
        /// Method to update template opened count.
        /// </summary>
        /// <param name="templateId">Current templateId</param>
        /// <returns></returns>
        public static async Task UpdateTemplateOpenCountAsync(string templateId)
        {
            var queryBuilder = new StringBuilder("UPDATE Templates ");
            queryBuilder.Append("SET TotalOpens = TotalOpens + 1 ");
            queryBuilder.Append("WHERE TemplateId = @TemplateId");

            var paramTemplateId = new SqlParameter("@TemplateId", SqlDbType.NVarChar, 255) { Value = templateId };

            await PerformNonQuery(queryBuilder.ToString(),
                new[] { paramTemplateId });
        }

        /// <summary>
        /// Method to insert/update template monthy count.
        /// </summary>
        /// <param name="templateId"></param>
        /// <returns></returns>
        public static async Task InsertUpdateMonthlyTemplateAccessAsync(string templateId)
        {
            var queryBuilder = new StringBuilder("IF NOT EXISTS( ");
            queryBuilder.Append("SELECT * FROM MonthlyTemplateAccess ");
            queryBuilder.Append("WHERE TemplateId = @TemplateId AND Year = @Year ");
            queryBuilder.Append("And Month = @Month) ");
            queryBuilder.Append("BEGIN ");
            queryBuilder.Append("  INSERT INTO MonthlyTemplateAccess(TemplateId, Year, Month, Opens) ");
            queryBuilder.Append("  VALUES(@TemplateId, @Year, @Month, 1) ");
            queryBuilder.Append("END ");
            queryBuilder.Append("ELSE ");
            queryBuilder.Append("BEGIN ");
            queryBuilder.Append("  UPDATE MonthlyTemplateAccess ");
            queryBuilder.Append("  SET Opens = Opens + 1 ");
            queryBuilder.Append("  WHERE TemplateId = @TemplateId AND Month = @Month AND Year = @Year ");
            queryBuilder.Append("END");

            var currentDate = DateTime.UtcNow;

            var paramUserKey = new SqlParameter("@TemplateId", SqlDbType.NVarChar, 255) { Value = templateId };
            var paramYear = new SqlParameter("@Year", SqlDbType.Int) { Value = currentDate.Year };
            var paramMonth = new SqlParameter("@Month", SqlDbType.Int) { Value = currentDate.Month };

            await PerformNonQuery(queryBuilder.ToString(),
                new[] { paramUserKey, paramYear, paramMonth });
        }

        /// <summary>
        /// Method to insert/update template monthly count location wise.
        /// </summary>
        /// <param name="location"></param>
        /// <returns></returns>
        public static async Task InsertUpdateMonthlyLocationAccessAsync(string location)
        {
            var queryBuilder = new StringBuilder("IF NOT EXISTS( ");
            queryBuilder.Append("SELECT * FROM MonthlyLocationAccess ");
            queryBuilder.Append("WHERE Location = @Location AND Year = @Year ");
            queryBuilder.Append("And Month = @Month) ");
            queryBuilder.Append("BEGIN ");
            queryBuilder.Append("  INSERT INTO MonthlyLocationAccess(Location, Year, Month, Opens) ");
            queryBuilder.Append("  VALUES(@Location, @Year, @Month, 1) ");
            queryBuilder.Append("END ");
            queryBuilder.Append("ELSE ");
            queryBuilder.Append("BEGIN ");
            queryBuilder.Append("  UPDATE MonthlyLocationAccess ");
            queryBuilder.Append("  SET Opens = Opens + 1 ");
            queryBuilder.Append("  WHERE Location = @Location AND Month = @Month AND Year = @Year ");
            queryBuilder.Append("END");

            var currentDate = DateTime.UtcNow;

            var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = location };
            var paramYear = new SqlParameter("@Year", SqlDbType.Int) { Value = currentDate.Year };
            var paramMonth = new SqlParameter("@Month", SqlDbType.Int) { Value = currentDate.Month };

            await PerformNonQuery(queryBuilder.ToString(),
                new[] { paramLocation, paramYear, paramMonth });
        }

        /// <summary>
        /// Method to get monthly form open count by location.
        /// </summary>
        /// <param name="location">SPHostUrl to be queried</param>
        /// <returns></returns>
        public static async Task<int> GetSiteMonthlyFormOpenCountAsync(string location)
        {
            var currentDate = DateTime.UtcNow;

            var queryBuilder = new StringBuilder("SELECT Opens FROM MonthlyLocationAccess ");
            queryBuilder.Append("WHERE Location = @Location "); ;
            queryBuilder.Append("AND Year = @Year ");
            queryBuilder.Append("And Month = @Month");

            var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = location };
            var paramYear = new SqlParameter("@Year", SqlDbType.Int) { Value = currentDate.Year };
            var paramMonth = new SqlParameter("@Month", SqlDbType.Int) { Value = currentDate.Month };

            var result = await PerformScalarQuery(queryBuilder.ToString(),
                new[] { paramLocation, paramYear, paramMonth });

            return Convert.ToInt32(result);
        }

        private static async Task DeleteMonthlyTemplateAccessDataAsync(string templateId)
        {
            var queryBuilder = new StringBuilder("DELETE FROM MonthlyTemplateAccess ");
            queryBuilder.Append("WHERE TemplateId = @TemplateId");

            var paramTemplateId = new SqlParameter("@TemplateId", SqlDbType.NVarChar, 255) { Value = templateId };

            await PerformNonQuery(queryBuilder.ToString(),
                new[] { paramTemplateId });
        }

        public static async Task<bool> CheckIsUsageExceededAsync(string location, DateTime date, int siteMonthlyOpenCount)
        {
            var queryBuilder = new StringBuilder("SELECT COUNT(*) FROM LocationAllowance ");
            queryBuilder.Append("WHERE Location = @Location ");
            queryBuilder.Append("AND Expiration >= @Expiration ");
            queryBuilder.Append("AND MonthlyOpens >= @MonthlyOpens ");

            var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = location };
            var paramExpiration = new SqlParameter("@Expiration", SqlDbType.Date) { Value = date };
            var paramMonthlyOpens = new SqlParameter("@MonthlyOpens", SqlDbType.Int) { Value = siteMonthlyOpenCount };

            var monthlyCountValue = await PerformScalarQuery(queryBuilder.ToString(),
                new[] { paramLocation, paramExpiration, paramMonthlyOpens });

            return Convert.ToInt32(monthlyCountValue) == 0;
        }

        /// <summary>
        /// Method to get location current and previous month opens count
        /// </summary>
        /// <param name="location">Site url</param>
        /// <param name="date">Utc date passed</param>
        /// <returns></returns>
        public static async Task<MonthlyUsageDetail> GetMonthlyUsageDetailAsync(string location, DateTime date)
        {
            var datePrevMonth = date.AddMonths(-1);

            var queryBuilder = new StringBuilder("SELECT * FROM MonthlyLocationAccess ");
            queryBuilder.Append("WHERE Location = @Location ");
            queryBuilder.Append("AND ((Year = @CurrentYear AND Month = @CurrentMonth) ");
            queryBuilder.Append("OR (Year = @PrevMonthYear AND Month = @PrevMonth)) ");

            var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = location };
            var paramCurrentYear = new SqlParameter("@CurrentYear", SqlDbType.Int) { Value = date.Year };
            var paramCurrentMonth = new SqlParameter("@CurrentMonth", SqlDbType.Int) { Value = date.Month };
            var paramPrevMonthYear = new SqlParameter("@PrevMonthYear", SqlDbType.Int) { Value = datePrevMonth.Year };
            var paramPrevMonth = new SqlParameter("@PrevMonth", SqlDbType.Int) { Value = datePrevMonth.Month };

            var listMonthlyLocation = await PerformQuery(queryBuilder.ToString(),
                reader => new MonthlyLocationAccess(reader),
                new[] { paramLocation, paramCurrentYear, paramCurrentMonth, paramPrevMonth, paramPrevMonthYear });

            var monthlyAccess = new MonthlyUsageDetail
            {
                Location = location,
                CurrentOpensCount = GetOpensCount(listMonthlyLocation, date),
                PrevOpensCount = GetOpensCount(listMonthlyLocation, datePrevMonth)
            };

            return monthlyAccess;
        }

        private static int GetOpensCount(IEnumerable<MonthlyLocationAccess> listMonthlyLocation, DateTime date)
        {
            var currentDetail = listMonthlyLocation.FirstOrDefault(x => x.Year == date.Year && x.Month == date.Month);
            if (currentDetail == null)
            {
                return 0;
            }

            return currentDetail.Opens;
        }

        /// <summary>
        /// Method to get license by location.
        /// </summary>
        /// <param name="location"></param>
        /// <returns></returns>
        public static async Task<LocationAllowance> GetLicenseAsync(string location)
        {
            try
            {
                var queryBuilder = new StringBuilder("SELECT TOP 1 * FROM LocationAllowance ");
                queryBuilder.Append("WHERE Location = @Location");
                var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = location };

                return (await PerformQuery(queryBuilder.ToString(),
                    reader => new LocationAllowance(reader),
                    new[] { paramLocation })).FirstOrDefault();
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Method to insert/update license.
        /// </summary>
        /// <param name="allowance"></param>
        /// <returns></returns>
        public static async Task InsertLicenseAsync(LocationAllowance allowance)
        {
            var queryBuilder = new StringBuilder("IF NOT EXISTS");
            queryBuilder.Append("(SELECT * FROM LocationAllowance WHERE Location = @Location) ");
            queryBuilder.Append("BEGIN ");
            queryBuilder.Append("  INSERT INTO LocationAllowance ");
            queryBuilder.Append("  VALUES(@Location, @MonthlyOpens, @Expiration) ");
            queryBuilder.Append("END ");
            queryBuilder.Append("ELSE ");
            queryBuilder.Append("BEGIN ");
            queryBuilder.Append("  UPDATE LocationAllowance ");
            queryBuilder.Append("  SET MonthlyOpens = @MonthlyOpens, Expiration = @Expiration ");
            queryBuilder.Append("  WHERE Location = @Location ");
            queryBuilder.Append("END");

            var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = allowance.Location };
            var paramMonthlyOpens = new SqlParameter("@MonthlyOpens", SqlDbType.Int) { Value = allowance.MonthlyOpens };
            var paramExpiration = new SqlParameter("@Expiration", SqlDbType.Date) { Value = allowance.Expiration.Value };

            await PerformNonQuery(queryBuilder.ToString(),
                new[] { paramLocation, paramMonthlyOpens, paramExpiration });
        }

        /// <summary>
        /// Method to search sites.
        /// </summary>
        /// <param name="date"></param>
        /// <param name="query"></param>
        /// <param name="isExpiredOnly"></param>
        /// <param name="defaultOpens"></param>
        /// <returns></returns>
        public static async Task<IEnumerable<string>> SearchSitesAsync(DateTime date, string query, bool isExpiredOnly, int defaultOpens)
        {
            var datePrevMonth = date.AddMonths(-1);
            List<SqlParameter> queryParams = new List<SqlParameter>
                {
                    new SqlParameter("@CurrentYear", SqlDbType.Int) { Value = date.Year },
                    new SqlParameter("@CurrentMonth", SqlDbType.Int) { Value = date.Month }
                };


            var queryBuilder = new StringBuilder("SELECT DISTINCT mla.Location FROM MonthlyLocationAccess mla ");
            if (!isExpiredOnly)
            {
                queryBuilder.Append("WHERE mla.Location LIKE @Location ");
                queryBuilder.Append("AND ((mla.Year = @CurrentYear AND mla.Month = @CurrentMonth) ");
                queryBuilder.Append("OR (mla.Year = @PrevMonthYear AND mla.Month = @PrevMonth)) ");

                var paramLocation = new SqlParameter("@Location", SqlDbType.NVarChar, 255) { Value = String.Format("%{0}%", query) };

                var paramPrevMonthYear = new SqlParameter("@PrevMonthYear", SqlDbType.Int) { Value = datePrevMonth.Year };
                var paramPrevMonth = new SqlParameter("@PrevMonth", SqlDbType.Int) { Value = datePrevMonth.Month };

                queryParams.AddRange(new[] { paramLocation, paramPrevMonth, paramPrevMonthYear });
            }
            else
            {
                queryBuilder.Append("WHERE mla.Opens > @DefaultOpens ");
                queryBuilder.Append("AND Year = @CurrentYear AND Month = @CurrentMonth ");
                queryBuilder.Append("AND mla.Location NOT IN( ");
                queryBuilder.Append(" SELECT mla.Location FROM MonthlyLocationAccess mla ");
                queryBuilder.Append(" LEFT JOIN LocationAllowance la ON mla.Location = la.Location ");
                queryBuilder.Append(" WHERE la.MonthlyOpens > mla.Opens ");
                queryBuilder.Append(" AND la.Expiration > CAST(GETDATE() AS DATE) ");
                queryBuilder.Append(" AND Year = @CurrentYear AND Month = @CurrentMonth) ");

                var paramDefaultOpens = new SqlParameter("@DefaultOpens", SqlDbType.Int) { Value = defaultOpens };

                queryParams.AddRange(new[] { paramDefaultOpens });

            }

            var listLocation = await PerformQuery(queryBuilder.ToString(),
                    reader => Convert.ToString(reader["Location"]),
                    queryParams);

            return listLocation;
        }

        /// <summary>
        /// Method to get customer list
        /// </summary>
        /// <returns></returns>
        public static async Task<IEnumerable<string>> GetCustomersListAsync()
        {
            var queryBuilder = new StringBuilder("SELECT DISTINCT SUBSTRING(Location, CHARINDEX('://', Location) + 3, CHARINDEX('.', Location) - CHARINDEX('://', Location) -3) AS Customer ");
            queryBuilder.AppendLine("FROM MonthlyLocationAccess ");
            queryBuilder.AppendLine("ORDER BY Customer");

            var customers = await PerformQuery(queryBuilder.ToString(),
                reader => Convert.ToString(reader["Customer"]),
                overrideConnString: ProdConnString);

            return customers;
        }

        public static async Task<IEnumerable<CustomerChartModel>> GetCustomersDataAsync(string customerName)
        {
            var queryParams = String.IsNullOrWhiteSpace(customerName)
                ? null
                : new List<SqlParameter>
                {
                    new SqlParameter("@Customer", SqlDbType.VarChar) { Value = customerName }
                };

            var queryBuilder = new StringBuilder("SELECT  Customer, Month, Year, SUM(opens) AS Opens FROM ");
            queryBuilder.AppendLine("(SELECT DISTINCT Location, SUBSTRING(Location, CHARINDEX('://', Location) + 3, CHARINDEX('.', Location) - CHARINDEX('://', Location) -3) Customer, ");
            queryBuilder.AppendLine("Month, Year, Opens ");
            queryBuilder.AppendLine("FROM MonthlyLocationAccess)chart ");

            if (!String.IsNullOrWhiteSpace(customerName))
            {
                queryBuilder.AppendLine("WHERE Customer = @Customer ");
            }

            queryBuilder.AppendLine("GROUP by Customer, Month, Year ");
            queryBuilder.AppendLine("ORDER BY Opens DESC, Customer ASC, Year DESC, Month ASC ");

            return (await PerformQuery(queryBuilder.ToString(),
                reader => new CustomerChartModel
                {
                    Customer = Convert.ToString(reader["Customer"]).ToPascalCase(),
                    Month = Convert.ToInt32(reader["Month"]),
                    Year = Convert.ToInt32(reader["Year"]),
                    Opens = Convert.ToInt32(reader["Opens"])
                },
                queryParams,
                overrideConnString: ProdConnString));
        }

        public static async Task<IEnumerable<string>> GetSitesByCustomerNameAsync(string customerName, bool isForm)
        {
            var queryBuilder = new StringBuilder();
            if (!isForm)
            {
                queryBuilder.Append("SELECT DISTINCT Location ");
                queryBuilder.AppendLine("FROM MonthlyLocationAccess ");
                queryBuilder.AppendLine("WHERE location LIKE @Location");
            }
            else
            {
                queryBuilder.Append("SELECT DISTINCT ISNULL(Location, '-1') AS Location FROM Templates ");
                queryBuilder.AppendLine("WHERE UserKey IN ");
                queryBuilder.AppendLine("(SELECT TOP 1 UserKey From Templates WHERE Location LIKE @Location)");
            }

            var queryParams = new List<SqlParameter>
                {
                    new SqlParameter("@Location", SqlDbType.VarChar) { Value = String.Format("%://{0}.%",customerName) }
                };

            return (await PerformQuery(queryBuilder.ToString(),
                reader => Convert.ToString(reader["Location"]),
                queryParams,
                overrideConnString: ProdConnString));
        }

        public static async Task<IEnumerable<SiteChartModel>> GetCustomerSitesDataAsync(string customer, string site)
        {
            var queryBuilder = new StringBuilder("SELECT * FROM MonthlyLocationAccess ");

            if (!String.IsNullOrWhiteSpace(customer))
            {
                queryBuilder.Append("WHERE Location LIKE @Customer ");
            }

            if (!String.IsNullOrWhiteSpace(site))
            {
                queryBuilder.Append("AND Location = @Site ");
            }

            queryBuilder.AppendLine("ORDER BY Opens DESC, Location, Month, Year");

            List<SqlParameter> queryParams = null;

            if (!String.IsNullOrWhiteSpace(customer))
            {
                queryParams = new List<SqlParameter>
                {
                    new SqlParameter("@Customer", SqlDbType.VarChar) { Value = String.Format("%://{0}.%",customer) }
                };
            }
            if (!String.IsNullOrWhiteSpace(site))
            {
                queryParams = queryParams ?? new List<SqlParameter>();

                queryParams.Add(
                    new SqlParameter("@Site", SqlDbType.VarChar) { Value = site }
                );
            }

            return (await PerformQuery(queryBuilder.ToString(),
                reader => new SiteChartModel
                {
                    Location = Convert.ToString(reader["Location"]),
                    Month = Convert.ToInt32(reader["Month"]),
                    Year = Convert.ToInt32(reader["Year"]),
                    Opens = Convert.ToInt32(reader["Opens"])
                }, queryParams,
                overrideConnString: ProdConnString));
        }

        public static async Task<IEnumerable<string>> GetFormsBySiteAsync(string customer, string site)
        {
            var queryBuilder = new StringBuilder("SELECT DISTINCT t.TemplateName FROM Templates t ");
            queryBuilder.AppendLine("INNER JOIN MonthlyTemplateAccess mta ON t.TemplateId = mta.templateId ");
            if (site != "-1")
            {
                queryBuilder.AppendLine("WHERE t.Location = @Location");
            }
            else
            {
                queryBuilder.AppendLine("WHERE t.UserKey IN ");
                queryBuilder.AppendLine("(SELECT TOP 1 UserKey From Templates WHERE Location LIKE @Location) ");
                queryBuilder.AppendLine("AND Location IS NULL");
            }

            var queryParams = new List<SqlParameter>
                {
                    new SqlParameter("@Location", SqlDbType.VarChar) { Value = site=="-1"? String.Format("%://{0}.%",customer): site }
                };

            return (await PerformQuery(queryBuilder.ToString(),
                reader => Convert.ToString(reader["TemplateName"]),
                queryParams,
                overrideConnString: ProdConnString));
        }

        public static async Task<IEnumerable<SiteChartModel>> GetSiteFormsDataAsync(string customer, string site, string templateName)
        {
            var queryBuilder = new StringBuilder("SELECT mta.*, t.TemplateName FROM MonthlyTemplateAccess mta ");
            queryBuilder.Append("INNER JOIN Templates t ON t.TemplateId = mta.templateId ");

            if (site != "-1")
            {
                queryBuilder.Append("WHERE t.Location = @Location ");
            }
            else
            {
                queryBuilder.AppendLine("WHERE t.UserKey IN ");
                queryBuilder.AppendLine("(SELECT TOP 1 UserKey From Templates WHERE Location LIKE @Location) ");
                queryBuilder.AppendLine("AND Location IS NULL");
            }

            if (!String.IsNullOrWhiteSpace(templateName))
            {
                queryBuilder.Append("AND t.TemplateName = @TemplateName ");
            }

            queryBuilder.AppendLine("ORDER BY Opens DESC, TemplateName, Month, Year");

            List<SqlParameter> queryParams = new List<SqlParameter>
                {
                    new SqlParameter("@Location", SqlDbType.VarChar) { Value = site=="-1"? String.Format("%://{0}.%",customer): site }
                };

            if (!String.IsNullOrWhiteSpace(templateName))
            {
                queryParams = queryParams ?? new List<SqlParameter>();

                queryParams.Add(
                    new SqlParameter("@TemplateName", SqlDbType.VarChar) { Value = templateName }
                );
            }

            return (await PerformQuery(queryBuilder.ToString(),
                reader => new SiteChartModel
                {
                    Location = Convert.ToString(reader["TemplateName"]),
                    Month = Convert.ToInt32(reader["Month"]),
                    Year = Convert.ToInt32(reader["Year"]),
                    Opens = Convert.ToInt32(reader["Opens"])
                }, queryParams,
                overrideConnString: ProdConnString));
        }
    }
}