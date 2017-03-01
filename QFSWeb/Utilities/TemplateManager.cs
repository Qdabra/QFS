using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using InfoPathServices;
using Microsoft.SharePoint.Client;
using QFSWeb.Models;
using QFSWeb.Interface;

namespace QFSWeb.Utilities
{
    public class TemplateManager
    {
        private static string GetUserKey()
        {
            return SpManager.GetRealm();
        }

        private static async Task<BlobFileInfo> GetTemplateFile(string templateName, string instanceId, string fileName, IStorageHelper storageContext)
        {
            if (string.IsNullOrWhiteSpace(templateName) || string.IsNullOrWhiteSpace(instanceId))
            {
                throw new Exception("Both templateName and instanceId must be specified.");
            }

            var userKey = GetUserKey();

            var blobInfo = await SQLTemplateStorageManager.GetTemplateFileWithCheck(userKey, templateName, instanceId, fileName, storageContext);

            return blobInfo;
        }

        public static async Task<ActionResult> GetTemplateFile(ClientContext clientContext, string libraryUrl, string xsnUrl, string templateName, string instanceId, string fileName, IStorageHelper storageContext)
        {
            if (templateName != null || instanceId != null)
            {
                var blobInfo = await GetTemplateFile(templateName, instanceId, fileName, storageContext);

                if (blobInfo != null)
                {
                    return new FileStreamResult(blobInfo.FileStream, blobInfo.ContentType);
                }

                return new HttpStatusCodeResult(HttpStatusCode.NotFound);
            }

            Stream stm = InfoPathAnalytics.TemplateFile(
                        clientContext,
                        libraryUrl,
                        xsnUrl,
                        fileName);
            return new FileStreamResult(stm, InfoPathServices.Utilities.GetContentType(fileName));
        }

        private static async Task<string> GetFileContents(Stream stream)
        {
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                return await reader.ReadToEndAsync();
            }
        }

        public static async Task<FormFile> GetTemplateFileContents(ClientContext clientContext, string libraryUrl, string xsnUrl, string templateName, string instanceId, string fileName, IStorageHelper storageContext)
        {
            if (templateName != null || instanceId != null)
            {
                var blobInfo = await GetTemplateFile(templateName, instanceId, fileName, storageContext);

                if (blobInfo == null)
                {
                    return null;
                }

                var contents = await GetFileContents(blobInfo.FileStream);

                return new FormFile(fileName, contents);
            }

            return InfoPathAnalytics.FormFileContents(clientContext, libraryUrl, xsnUrl, fileName);
        }

        public static async Task<ManifestFileWithProperties> ManifestWithProperties(ClientContext clientContext, string libraryUrl,
            string xsnUrl, string templateName, IStorageHelper storageContext)
        {
            if (templateName != null)
            {
                return await GetManifestForTemplateName(templateName, storageContext);
            }

            return InfoPathAnalytics.ManifestWithProperties(clientContext, libraryUrl, xsnUrl);
        }

        private static async Task<ManifestFileWithProperties> GetManifestForTemplateName(string templateName, IStorageHelper storageContext)
        {
            return await SQLTemplateStorageManager.GetManifestForTemplateName(templateName, storageContext);
        }

        //private static async Task<ManifestFileWithProperties> GetManifestForTemplateName(string templateName)
        //{
        //var templateRecord = GetTemplateRecord(templateName);

        //if (templateRecord == null)
        //{
        //    return null;
        //}

        //var instanceId = templateRecord.CurrentInstanceId;

        //var instanceRecord = TemplateStorageManager.GetInstanceRecord(templateRecord.TemplateId, instanceId);

        //if (instanceRecord == null)
        //{
        //    return null;
        //}

        //var manifestFileName = instanceRecord.ManifestFileName;

        //var manifestBlobInfo = await TemplateStorageManager.GetTemplateFile(instanceId, manifestFileName);

        //var manifestContents = await GetFileContents(manifestBlobInfo.FileStream);

        //var formProperties = new FormPropertyList();
        //formProperties.Add("templateName", templateName);
        //formProperties.Add("instanceId", instanceId);

        //var manifest = new ManifestFileWithProperties(formProperties,
        //    new FormFile(manifestFileName, manifestContents));

        //return manifest;
        //}

        public static async Task<PreprocessedViewFile> GetPreprocessedView(
            ClientContext clientContext,
            string libraryUrl,
            string xsnUrl,
            string templateName,
            string instanceId,
            string viewFileName,
            string format,
            string paramNames,
            string paramValues,
            IStorageHelper storageContext)
        {
            if (string.IsNullOrWhiteSpace(viewFileName))
            {
                throw new ArgumentNullException("viewFileName", "View file name unspecified");
            }

            if (!string.IsNullOrWhiteSpace(templateName))
            {
                var templateFile = await GetTemplateFile(templateName, instanceId, viewFileName, storageContext);

                if (templateFile == null)
                {
                    return null;
                }

                var contents = await GetFileContents(templateFile.FileStream);

                return InfoPathAnalytics.PreprocessedView(contents, viewFileName, paramNames, paramValues);
            }

            return InfoPathAnalytics.PreprocessedView(
                clientContext,
                libraryUrl,
                xsnUrl,
                viewFileName,
                format,
                paramNames,
                paramValues);
        }

        /// <summary>
        /// Method to download uploaded xsn file.
        /// </summary>
        /// <param name="templateName">Stored template name.</param>
        /// <returns></returns>
        public static async Task<BlobFileInfo> GetXsnBlobInfo(string templateName, IStorageHelper storageContext)
        {
            return await SQLTemplateStorageManager.GetXsnBlobInfo(templateName, storageContext);
            //return await TemplateStorageManager.GetXsnBlobInfo(templateName);
        }

        /// <summary>
        /// Method to delete template.
        /// </summary>
        /// <param name="templateName">Template name.</param>
        /// <returns></returns>
        public static async Task<bool> DeleteTemplate(string templateName, IStorageHelper storageContext)
        {
            return await SQLTemplateStorageManager.DeleteTemplate(templateName, storageContext);
        }

        ///// <summary>
        ///// Method to delete template.
        ///// </summary>
        ///// <param name="templateName">Template name.</param>
        ///// <returns></returns>
        //public static async Task<bool> DeleteTemplate(string templateName)
        //{
        //    try
        //    {
        //        var templateRecord = GetTemplateRecord(templateName);

        //        if (templateRecord == null)
        //        {
        //            return false;
        //        }

        //        var instanceId = templateRecord.CurrentInstanceId;
        //        var instanceRecord = TemplateStorageManager.GetInstanceRecord(templateRecord.TemplateId, instanceId);

        //        if (instanceRecord == null)
        //        {
        //            return false;
        //        }

        //        await TemplateStorageManager.DeleteInstance(instanceRecord);
        //        await TemplateStorageManager.DeleteTemplateEntity(templateRecord);

        //        return true;
        //    }
        //    catch
        //    {
        //        return false;
        //    }

        //}

        ///// <summary>
        ///// Method to get template record for template name
        ///// </summary>
        ///// <param name="templateName">Template name.</param>
        ///// <returns></returns>
        //private static FormTemplateEntity GetTemplateRecord(string templateName)
        //{
        //    var userId = GetUserKey();

        //    var templateRecord = TemplateStorageManager.GetTemplateRecord(userId, templateName);

        //    if (templateRecord == null)
        //    {
        //        return null;
        //    }

        //    return templateRecord;
        //}
    }
}