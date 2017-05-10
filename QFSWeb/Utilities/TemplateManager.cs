using InfoPathServices;
using Microsoft.SharePoint.Client;
using QFSWeb.Interface;
using QFSWeb.Models.SQLModels;
using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;

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
            string xsnUrl, string templateName, IStorageHelper storageContext, string instanceId = null)
        {
            if (templateName != null)
            {
                return await GetManifestForTemplateName(templateName, storageContext, instanceId);
            }

            return InfoPathAnalytics.ManifestWithProperties(clientContext, libraryUrl, xsnUrl);
        }

        private static async Task<ManifestFileWithProperties> GetManifestForTemplateName(string templateName, IStorageHelper storageContext, string instanceId)
        {
            return await SQLTemplateStorageManager.GetManifestForTemplateName(templateName, storageContext, instanceId);
        }

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

        /// <summary>
        /// Method to get template record
        /// </summary>
        /// <param name="userKey">User Key</param>
        /// <param name="templateName">Template name</param>
        /// <returns></returns>
        public static async Task<FormTemplateModel> GetTemplateRecord(string userKey, string templateName)
        {
            return await SQLTemplateStorageManager.GetTemplateRecord(userKey, templateName);
        }
    }
}