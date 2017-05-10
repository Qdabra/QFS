using InfoPathServices;
using Microsoft.SharePoint.Client;
using QFSWeb.Interface;
using QFSWeb.Models;
using QFSWeb.Utilities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Xml;

namespace QFSWeb.Controllers
{
    public class FormsController : Controller
    {
        private IStorageHelper StorageContext;

        public FormsController(IStorageHelper storageHelper)
        {
            StorageContext = storageHelper;
        }

        #region Session State Test
        private int? StateValue
        {
            get
            {
                int? iValue = (int?)System.Web.HttpContext.Current.Session["StateValue"];
                if (iValue.HasValue)
                {
                    return iValue.Value;
                }
                return 0;
            }
            set
            {
                System.Web.HttpContext.Current.Session["StateValue"] = value;
            }
        }

        [SharePointContextFilter]
        public ActionResult SharePointGetState()
        {
            StateValue += 1;  // StateValue is a property that gets/sets a value in the Session

            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                string username = "unknown";

                if (clientContext != null)
                {
                    User spUser = clientContext.Web.CurrentUser;

                    clientContext.Load(spUser, user => user.Title);

                    clientContext.ExecuteQuery();

                    username = spUser.Title;
                }
                string msg = string.Format("Count: {0},   User: {1}", StateValue, username);
                return Content(msg);
            }
        }

        [Route("GetState"), HttpGet]
        public ActionResult GetState()
        {
            StateValue += 1;  // StateValue is a property that gets/sets a value in the Session

            return Content(StateValue.ToString());
        }
        #endregion

        [SharePointContextFilter]
        public ActionResult FormInformation(string libraryUrl, string xsnUrl)
        {
            using (var clientContext = GetSharePointContext())
            {
                InfoPathServices.FormInformation info = null;

                info = InfoPathAnalytics.FormInformation(clientContext, libraryUrl, xsnUrl);
                SortFormInformation(info);
                return new ObjectResult<FormInformation>(info);
            }
        }

        [SharePointContextFilter]
        public async Task<ActionResult> TemplateFile(string libraryUrl = null, string xsnUrl = null, string fileName = null, string templateName = null, string instanceId = null)
        {
            try
            {
                using (var clientContext = GetSharePointContext())
                {
                    CheckAndAddExpiryHeader(instanceId);

                    return await TemplateManager.GetTemplateFile(clientContext, libraryUrl, xsnUrl, templateName, instanceId, fileName, StorageContext);
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        [SharePointContextFilter]
        public async Task<ActionResult> FormFileContents(string libraryUrl = null, string xsnUrl = null, string templateName = null, string instanceId = null, string fileName = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                var formFile = await TemplateManager.GetTemplateFileContents(clientContext, libraryUrl, xsnUrl, templateName,
                            instanceId, fileName, StorageContext);

                if (formFile == null)
                {
                    return new HttpStatusCodeResult(HttpStatusCode.NotFound);
                }

                CheckAndAddExpiryHeader(instanceId);

                return new ObjectResult<FormFile>(formFile);
            }
        }

        [HttpPost]
        public ActionResult FormFileContentsFromFormFileRequest(FormFileRequest formFileRequest = null)
        {
            FormFile ff = InfoPathAnalytics.FormFileContentsFromFormFileRequest(formFileRequest);
            if (string.Compare(formFileRequest.Format, "xml", true) == 0)
            {
                return new XmlResult(ff);
            }
            return new JsonResult()
                {
                    Data = ff,
                    ContentEncoding = System.Text.Encoding.UTF8,
                    ContentType = "application/json"
                };
        }

        [SharePointContextFilter]
        public ActionResult AllFormProperties(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<FormPropertyList>(InfoPathAnalytics.AllFormProperties(
                            clientContext,
                            libraryUrl,
                            xsnUrl));
            }
        }

        [HttpPost]
        public ActionResult AllFormPropertiesFromFormFileRequest(FormFileRequest formFileRequest)
        {
            FormPropertyList fpl = InfoPathAnalytics.AllFormPropertiesFromFormFileRequest(formFileRequest);
            if (string.Compare(formFileRequest.Format, "xml", true) == 0)
            {
                return new XmlResult(fpl);
            }
            return new JsonResult()
            {
                Data = fpl,
                ContentEncoding = System.Text.Encoding.UTF8,
                ContentType = "application/json"
            };
        }

        [HttpPost]
        public ActionResult FormInformationFromFormFileRequest(FormFileRequest formFileRequest)
        {
            FormInformation fi = InfoPathAnalytics.FormInformationFromFormFileRequest(formFileRequest);
            if (string.Compare(formFileRequest.Format, "xml", true) == 0)
            {
                return new XmlResult(fi);
            }
            return new JsonResult()
            {
                Data = fi,
                ContentEncoding = System.Text.Encoding.UTF8,
                ContentType = "application/json"
            };
        }


        [SharePointContextFilter]
        public async Task<ActionResult> ManifestWithProperties(string libraryUrl = null, string xsnUrl = null, string templateName = null)
        {
            try
            {
                using (var clientContext = GetSharePointContext())
                {
                    var manifest = await TemplateManager.ManifestWithProperties(clientContext, libraryUrl, xsnUrl, templateName, StorageContext);

                    if (manifest == null)
                    {
                        return new HttpStatusCodeResult(HttpStatusCode.NotFound);
                    }

                    return new ObjectResult<ManifestFileWithProperties>(manifest);
                }
            }
            catch (Exception e)
            {
                throw;
            }
        }

        public ActionResult ManifestWithPropertiesFromFormFileRequest(FormFileRequest formFileRequest)
        {
            return new ObjectResult<ManifestFileWithProperties>(InfoPathAnalytics.ManifestWithPropertiesFromFormFileRequest(
                formFileRequest));
        }

        [SharePointContextFilter]
        public async Task<ActionResult> PreprocessedView(
            string libraryUrl = null,
            string xsnUrl = null,
            string templateName = null,
            string instanceId = null,
            string viewFileName = null,
            string format = null,
            string paramNames = null,
            string paramValues = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                var view = await TemplateManager.GetPreprocessedView(
                    clientContext,
                    libraryUrl,
                    xsnUrl,
                    templateName,
                    instanceId,
                    viewFileName,
                    format,
                    paramNames,
                    paramValues,
                    StorageContext);

                if (view == null)
                {
                    return new HttpStatusCodeResult(HttpStatusCode.NotFound);
                }

                return new ObjectResult<PreprocessedViewFile>(view);
            }
        }

        public ActionResult PreprocessedViewFromFormFileRequest(FormFileRequest viewRequest = null, Dictionary<string, string> parameters = null)
        {
            return new ObjectResult<PreprocessedViewFile>(InfoPathAnalytics.PreprocessedViewFromFormFileRequest(
                viewRequest,
                parameters));
        }

        [SharePointContextFilter]
        public ActionResult FormVersion(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<Property>(InfoPathAnalytics.FormVersion(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult FormCompatibility(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<FormPropertyList>(InfoPathAnalytics.FormCompatibility(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult FormName(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<FormPropertyList>(InfoPathAnalytics.FormName(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult FormSecuritySettings(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<FormPropertyList>(InfoPathAnalytics.FormSecuritySettings(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult DataConnectionCount(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<Property>(InfoPathAnalytics.DataConnectionCount(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult DataConnections(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<DataConnectionList>(InfoPathAnalytics.DataConnections(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult ViewCount(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<Property>(InfoPathAnalytics.ViewCount(clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        [SharePointContextFilter]
        public ActionResult Views(string libraryUrl = null, string xsnUrl = null)
        {
            using (var clientContext = GetSharePointContext())
            {
                return new ObjectResult<ViewInfoList>(InfoPathAnalytics.Views(
                    clientContext,
                    libraryUrl,
                    xsnUrl));
            }
        }

        public ActionResult GenerateGuid()
        {
            return new ObjectResult<string>(Guid.NewGuid().ToString());
        }

        [SharePointContextFilter]
        public async Task<ActionResult> DownloadTemplate(string templateName)
        {
            if (String.IsNullOrWhiteSpace(templateName))
            {
                return new EmptyResult();
            }

            //var blobInfo = await TemplateManager.GetXsnBlobInfo(templateName);

            var blobInfo = await TemplateManager.GetXsnBlobInfo(templateName, StorageContext);

            if (blobInfo == null)
            {
                return new EmptyResult();
            }

            return File(blobInfo.FileStream, blobInfo.ContentType, blobInfo.FileName);
        }

        [HttpPost]
        [SharePointContextFilter]
        public async Task<ActionResult> DeleteTemplate(string templateName)
        {
            using (var context = SpManager.GetSharePointContext(HttpContext))
            {
                if (!SpManager.IsUserAdmin(context))
                {
                    return Json(false);
                }
            }

            if (String.IsNullOrWhiteSpace(templateName))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var result = await TemplateManager.DeleteTemplate(templateName, StorageContext);

            return Json(result);
        }

        [SharePointContextFilter]
        public async Task<ActionResult> TemplateDefinition(string libraryUrl = null, string xsnUrl = null, string templateName = null, bool includeTemplateXml = false, string instanceId = null)
        {
            try
            {
                using (var clientContext = GetSharePointContext())
                {
                    var userKey = SpManager.GetRealm();

                    if (xsnUrl != null)
                    {
                        var redirectTemplateName = await SQLTemplateStorageManager.FindRedirectTemplateName(userKey, xsnUrl);

                        if (redirectTemplateName != null)
                        {
                            templateName = redirectTemplateName;
                            xsnUrl = null;
                        }
                    }

                    var manifest = await TemplateManager.ManifestWithProperties(clientContext, libraryUrl, xsnUrl, templateName, StorageContext, instanceId);

                    if (manifest == null)
                    {
                        return new HttpStatusCodeResult(HttpStatusCode.NotFound);
                    }

                    var template = new TemplateDefinition
                    {
                        TemplateName = templateName,
                        XsnUrl = xsnUrl,
                        LibraryUrl = libraryUrl
                    };

                    template.Files.Add(manifest.FormFile);

                    if (!String.IsNullOrWhiteSpace(templateName))
                    {
                        template.InitializeInstanceId(manifest);
                    }

                    var tasks = GetContentList(manifest, includeTemplateXml)
                        .Select(item => GetTemplateFileOrFail(clientContext, libraryUrl, xsnUrl, templateName, template.InstanceId, item, StorageContext))
                        .ToList();

                    while (tasks.Count > 0)
                    {
                        var task = await Task.WhenAny(tasks);

                        tasks.Remove(task);

                        template.Files.Add(await task);
                    }

                    await CheckAndUpdateOpenCountAsync(templateName, userKey);

                    CheckAndAddExpiryHeader(instanceId);

                    return new ObjectResult<TemplateDefinition>(template);
                }
            }
            catch (Exception e)
            {
                return new ObjectResult<ErrorModel>(ErrorModel.FromException(e));
            }
        }

        [SharePointContextFilter]
        public async Task<ActionResult> GetTemplateInfo(string templateName)
        {
            if (String.IsNullOrWhiteSpace(templateName))
            {
                return new ObjectResult<string>(null);
            }

            try
            {
                var template = await TemplateManager.GetTemplateRecord(SpManager.GetRealm(), templateName);

                if (template == null)
                {
                    return new ObjectResult<string>(null);
                }

                var templateInfo = new
                {
                    instanceId = template.CurrentInstanceId
                };

                return new ObjectResult<object>(templateInfo);
            }
            catch (Exception ex)
            {
                return new ObjectResult<ErrorModel>(ErrorModel.FromException(ex));
            }

        }

        # region Private Methods

        private void SortFormInformation(InfoPathServices.FormInformation info)
        {
            info.DataConnections.Sort((x, y) =>
            {
                if (x.Name == null && y.Name == null) return 0;
                if (x.Name == null) return -1;
                if (y.Name == null) return 1;
                return x.Name.CompareTo(y.Name);
            });
        }

        private ClientContext GetSharePointContext()
        {
            return SpManager.GetSharePointContext(HttpContext);
        }

        private async Task<FormFile> GetTemplateFileOrFail(ClientContext clientContext, string libraryUrl,
            string xsnUrl, string templateName, string instanceId, string fileName, IStorageHelper storageContext)
        {
            var file = await TemplateManager.GetTemplateFileContents(
                clientContext,
                libraryUrl,
                xsnUrl,
                templateName,
                instanceId,
                fileName,
                StorageContext);

            if (file == null)
            {
                throw new ApplicationException(string.Format("Could not find file {0}.", fileName));
            }

            return file;
        }

        /// <summary>
        /// Method to check and update template open count.
        /// </summary>
        /// <param name="templateName"></param>
        /// <param name="userKey"></param>
        /// <returns></returns>
        private static async Task CheckAndUpdateOpenCountAsync(string templateName, string userKey)
        {
            try
            {
                if (!string.IsNullOrEmpty(templateName))
                {
                    var templateRecord = await SQLTemplateStorageManager.GetTemplateRecord(userKey, templateName);

                    if (templateRecord != null)
                    {
                        await SQLTemplateStorageManager.UpdateTemplateOpenCountAsync(templateRecord.TemplateId);
                        await SQLTemplateStorageManager.InsertUpdateMonthlyTemplateAccessAsync(templateRecord.TemplateId);

                        var location = GetCurrentLocation();

                        await SQLTemplateStorageManager.InsertUpdateMonthlyLocationAccessAsync(location);
                    }
                }
            }
            catch
            {
                //TODO: Log error
            }
        }

        private static IEnumerable<string> GetContentList(ManifestFileWithProperties manifest, bool includeTemplateXml)
        {
            using (var sr = new StringReader(manifest.FormFile.Contents))
            {
                using (var transReader = XmlReader.Create(sr, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit }))
                {
                    var xmlDoc = new XmlDocument();
                    xmlDoc.Load(transReader);

                    var nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
                    nsmgr.AddNamespace("xsf", "http://schemas.microsoft.com/office/infopath/2003/solutionDefinition");

                    var templateFileName = GetTemplateFileName(xmlDoc, nsmgr);

                    var files = Enumerable.Empty<string>()
                        .Concat(GetServiceAdapterNames(xmlDoc, nsmgr))
                        .Concat(GetOnLoadFileNames(xmlDoc, nsmgr));

                    if (files.Any())
                    {
                        var xsfFiles = GetXsfFileList(xmlDoc, nsmgr);
                        files = files.Where(f => !String.IsNullOrWhiteSpace(f) && xsfFiles.Any(xf => String.Compare(xf, f, StringComparison.OrdinalIgnoreCase) == 0));
                    }

                    return includeTemplateXml && templateFileName != null
                        ? files.Concat(new[] { templateFileName })
                        : files;
                }
            }
        }

        private static IEnumerable<string> GetNodeValues(XmlNode startingNode, string path, XmlNamespaceManager nsmgr)
        {
            return startingNode.SelectNodes(path, nsmgr)
                .Cast<XmlNode>()
                .Select(n => n.Value);
        }

        private static IEnumerable<string> GetServiceAdapterNames(XmlNode xmlDoc, XmlNamespaceManager nsmgr)
        {
            const string path = "//xsf:webServiceAdapter//xsf:operation//xsf:input/@source";

            return GetNodeValues(xmlDoc, path, nsmgr);
        }

        private static IEnumerable<string> GetOnLoadFileNames(XmlNode xmlDoc, XmlNamespaceManager nsmgr)
        {
            const string path =
                "//xsf:dataObject[@initOnLoad = 'yes']/xsf:query/xsf:xmlFileAdapter/@fileUrl[starts-with(., 'x-soln:///') or not(contains(., '/'))]";

            return GetNodeValues(xmlDoc, path, nsmgr).Select(v => v.Replace("x-soln:///", ""));
        }

        private static string GetTemplateFileName(XmlNode xmlDoc, XmlNamespaceManager nsmgr)
        {
            var node = xmlDoc.SelectSingleNode("//xsf:fileNew/xsf:initialXmlDocument/@href", nsmgr);

            return node != null ? node.Value : null;
        }

        private static IEnumerable<string> GetXsfFileList(XmlNode xmlDoc, XmlNamespaceManager nsmgr)
        {
            const string path = "xsf:xDocumentClass/xsf:package/xsf:files/xsf:file/@name";

            return GetNodeValues(xmlDoc, path, nsmgr);
        }

        private static string GetCurrentLocation()
        {
            return QfsUtility.FormatLocation(SpManager.GetSpHost());
        }

        private void CheckAndAddExpiryHeader(string instanceId)
        {
            if (!String.IsNullOrWhiteSpace(instanceId))
            {
                var currentDate = DateTime.UtcNow;

                HttpContext.Response.Cache.SetCacheability(HttpCacheability.Private);
                HttpContext.Response.Cache.SetExpires(currentDate.AddDays(7));
                HttpContext.Response.Cache.SetLastModified(currentDate);
            }
        }

        # endregion
    }
}
