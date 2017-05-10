using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using SP = Microsoft.SharePoint.Client;
using Microsoft.SharePoint.Client;
using QFSWeb.Models;
using QFSWeb.Interface;
using QFSWeb.Utilities;
using System.Threading.Tasks;
using System.IO;
using System.Xml;
using System.Xml.Serialization;
using InfoPathServices;
using System.Net;
using System.Diagnostics;
//using Microsoft.SharePoint.Client.Utilities;
//using Microsoft.SharePoint.Client.Workflow;

namespace QFSWeb.Controllers
{
    public class ScannerController : Controller
    {
        private IStorageHelper StorageContext;

        public ScannerController(IStorageHelper storageHelper)
        {
            StorageContext = storageHelper;
        }

        private readonly List<int> DocumentTypeBaseId = new List<int>
        {
            101,//Document Library,
            109,//Picture Library
            115,//XML Form Library
            119,//Web Page Library
            130,//Data Connection Library
            212//Home Page Library
        };

        // Validates, caches key and redirects to javascript page
        [SharePointContextFilter]
        public ActionResult Index()
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
            }
            return View(new IndexViewModel
            {
                Version = QfsUtility.InternalGetQFSVersion()
            });
        }

        public class ListInfo
        {
            public ListInfo(List list, bool isLoadContentTypes = false)
            {
                this.Title = list.Title;
                this.Id = list.Id;
                this.ParentWebUrl = list.ParentWebUrl;
                this.ContentTypesEnabled = list.ContentTypesEnabled;
                this.DefaultDisplayFormUrl = list.DefaultDisplayFormUrl;
                this.DocumentTemplateUrl = list.DocumentTemplateUrl;
                this.HasExternalDataSource = list.HasExternalDataSource;
                this.HasUniqueRoleAssignments = list.HasUniqueRoleAssignments;
                this.ItemCount = list.ItemCount;
                try { this.RootFolderUrl = list.RootFolder.ServerRelativeUrl; }
                catch (Exception ex) { }

                Forms = new List<ContentTypeInfo>();
                if (list.ContentTypesEnabled)
                {
                    foreach (ContentType ct in list.ContentTypes)
                    {
                        Forms.Add(new ContentTypeInfo(ct));
                    }
                }
            }
            public string Title { get; set; }
            public Guid Id { get; set; }
            public string ParentWebUrl { get; set; }
            public bool ContentTypesEnabled { get; set; }
            public List<ContentTypeInfo> Forms { get; set; }
            public string DefaultDisplayFormUrl { get; set; }
            public string DocumentTemplateUrl { get; set; }
            public bool HasExternalDataSource { get; set; }
            public bool HasUniqueRoleAssignments { get; set; }
            public int ItemCount { get; set; }
            public string RootFolderUrl { get; set; }
        }

        public class ContentTypeInfo
        {
            public ContentTypeInfo(ContentType ct)
            {
                this.Name = ct.Name;
                this.Description = ct.Description;
                this.DisplayFormTemplateName = ct.DisplayFormTemplateName;
                this.DisplayFormUrl = ct.DisplayFormUrl;
                this.DocumentTemplate = ct.DocumentTemplate;
                this.DocumentTemplateUrl = ct.DocumentTemplateUrl;
                this.EditFormTemplateName = ct.EditFormTemplateName;
                this.EditFormUrl = ct.EditFormUrl;
                this.Group = ct.Group;
                this.Hidden = ct.Hidden;
                this.Id = ct.Id.StringValue;
                this.NewFormTemplateName = ct.NewFormTemplateName;
                this.NewFormUrl = ct.NewFormUrl;
                this.ReadOnly = ct.ReadOnly;
                this.SchemaXml = ct.SchemaXml;
                this.Scope = ct.Scope;
                this.Sealed = ct.Sealed;
                this.StringId = ct.StringId;
            }
            public string Description { get; set; }
            public string DisplayFormTemplateName { get; set; }
            public string DisplayFormUrl { get; set; }
            public string DocumentTemplate { get; set; }
            public string DocumentTemplateUrl { get; set; }
            public string EditFormTemplateName { get; set; }
            public string EditFormUrl { get; set; }
            public string Group { get; set; }
            public bool Hidden { get; set; }
            public string Id { get; set; }
            public string Name { get; set; }
            public string NewFormTemplateName { get; set; }
            public string NewFormUrl { get; set; }
            public bool ReadOnly { get; set; }
            public string SchemaXml { get; set; }
            public string Scope { get; set; }
            public bool Sealed { get; set; }
            public string StringId { get; set; }
            public string RelativeUrl { get; set; }
        }

        public class SiteInfo
        {
            public List<ContentTypeInfo> ContentTypes { get; set; }
            public List<ListInfo> Lists { get; set; }
            public List<ListInfo> FormLibraries { get; set; }
            public List<ListInfo> Libraries { get; set; }
            public List<string> Messages { get; set; }
            public SiteInfo()
            {
                this.ContentTypes = new List<ContentTypeInfo>();
                this.Lists = new List<ListInfo>();
                this.FormLibraries = new List<ListInfo>();
                this.Libraries = new List<ListInfo>();
                this.Messages = new List<string>();
            }
        }

        [SharePointContextFilter]
        public ActionResult SiteLists()
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            SiteInfo info = new SiteInfo();

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                try
                {
                    SP.Web web = clientContext.Web;
                    clientContext.Load(web);
                    clientContext.ExecuteQuery();

                    GetContentTypes(info, clientContext, web);

                    GetListsAndLibraries(info, clientContext, web);
                }
                catch (Exception ex)
                {
                    info.Messages.Add("Error");
                }
            }
            return PartialView("SiteLists", info);
        }

        private void GetListsAndLibraries(SiteInfo info, ClientContext clientContext, SP.Web web)
        {
            try
            {
                clientContext.Load(
                    web.Lists,
                    lists => lists.Where(
                        list => list.Hidden == false && list.HasExternalDataSource == false).Include(
                            list => list.Title,
                            list => list.Id,
                            list => list.ParentWebUrl,
                            list => list.DefaultDisplayFormUrl,
                            list => list.DocumentTemplateUrl,
                            list => list.HasExternalDataSource,
                            list => list.HasUniqueRoleAssignments,
                            list => list.ItemCount,
                            list => list.RootFolder,
                            list => list.BaseTemplate,
                            list => list.ContentTypesEnabled).OrderBy(list => list.Title));
                clientContext.ExecuteQuery();

                foreach (List list in web.Lists)
                {
                    try
                    {
                        if (list.ContentTypesEnabled)
                        {
                            clientContext.Load(list.ContentTypes,
                                ctypes => //ctypes.Where(ctype => ctype.Group == "Form" || ctype.Group == "InfoPath Form Template")
                                    ctypes.Include(
                                        ctype => ctype.Description,
                                        ctype => ctype.DisplayFormTemplateName,
                                        ctype => ctype.DisplayFormUrl,
                                        ctype => ctype.DocumentTemplate,
                                        ctype => ctype.DocumentTemplateUrl,
                                        ctype => ctype.EditFormTemplateName,
                                        ctype => ctype.EditFormUrl,
                                        ctype => ctype.Group,
                                        ctype => ctype.Hidden,
                                        ctype => ctype.Id,
                                        ctype => ctype.Name,
                                        ctype => ctype.NewFormTemplateName,
                                        ctype => ctype.NewFormUrl,
                                        ctype => ctype.ReadOnly,
                                        ctype => ctype.SchemaXml,
                                        ctype => ctype.Scope,
                                        ctype => ctype.Sealed,
                                        ctype => ctype.StringId
                                    ));
                            clientContext.ExecuteQuery();
                        }

                        ListInfo listInfo = new ListInfo(list, list.ContentTypesEnabled);

                        if (DocumentTypeBaseId.Any(id => id == list.BaseTemplate))
                        {
                            info.Libraries.Add(listInfo);
                        }

                        if (!list.ContentTypesEnabled)
                        {
                            if (list.DocumentTemplateUrl == null || !list.DocumentTemplateUrl.EndsWith(".xsn", StringComparison.InvariantCultureIgnoreCase))
                                continue;
                        }

                        if (list.BaseTemplate == 115) /* InfoPath Form Library */
                        {
                            info.FormLibraries.Add(listInfo);
                        }
                        else if (UsesInfoPathForms(list))
                        {
                            info.Lists.Add(listInfo);
                        }
                    }
                    catch (Exception ex)
                    {
                        info.Messages.Add(string.Format("Error collecting list detail for '{0}'", list.Title));
                    }
                }
            }
            catch (Exception ex)
            {
                info.Messages.Add("Error collecting site lists");
            }
        }

        private static void GetContentTypes(SiteInfo info, ClientContext clientContext, SP.Web web)
        {
            try
            {
                clientContext.Load(web.AvailableContentTypes,
                    acts => acts.Where(act => act.Group == "Microsoft InfoPath" && act.Hidden == false)
                        .Include(
                            act => act.Description,
                            act => act.DisplayFormTemplateName,
                            act => act.DisplayFormUrl,
                            act => act.DocumentTemplate,
                            act => act.DocumentTemplateUrl,
                            act => act.EditFormTemplateName,
                            act => act.EditFormUrl,
                            act => act.Group,
                            act => act.Hidden,
                            act => act.Id,
                            act => act.Name,
                            act => act.NewFormTemplateName,
                            act => act.NewFormUrl,
                            act => act.ReadOnly,
                            act => act.SchemaXml,
                            act => act.Scope,
                            act => act.Sealed,
                            act => act.StringId
                        ));
                clientContext.ExecuteQuery();

                foreach (Microsoft.SharePoint.Client.ContentType ct in web.AvailableContentTypes)
                {
                    ContentTypeInfo cti = new ContentTypeInfo(ct);

                    info.ContentTypes.Add(cti);
                }
            }
            catch (Exception ex)
            {
                info.Messages.Add("Error collecting available content types");
            }
        }

        private bool UsesInfoPathForms(List list)
        {
            if (list.ContentTypes == null) return false;
            foreach (ContentType ct in list.ContentTypes)
            {
                if (ct.DocumentTemplateUrl != null && ct.DocumentTemplateUrl.EndsWith(".xsn"))
                    return true;
            }
            return false;
        }

        [SharePointContextFilter]
        public ActionResult ScanTemplate()
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);
            string spListId = this.Request["SPListId"];
            string spListItemId = this.Request["SPListItemId"];
            string relativeUrl = this.Request["url"];

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                SP.File file = null;

                SP.Web web = clientContext.Web;
                clientContext.Load(web);

                if (string.IsNullOrEmpty(relativeUrl))
                {
                    Guid listId = new Guid(spListId);
                    int itemId = Convert.ToInt32(spListItemId);

                    SP.List spList = clientContext.Web.Lists.GetById(listId);
                    clientContext.Load<SP.List>(spList);

                    SP.ListItem item = spList.GetItemById(itemId);
                    clientContext.Load<SP.ListItem>(item);
                    clientContext.ExecuteQuery();
                    file = item.File;
                }
                else
                {
                    file = web.GetFileByServerRelativeUrl(relativeUrl);
                }
                FormInformation info = InfoPathAnalytics.FormInformation(clientContext, file);
                info.XsnUrl = file.ServerRelativeUrl;
                return View(info);
            }
        }

        [SharePointContextFilter]
        [ActionName("ScanTemplateDiag")]
        public async Task<ActionResult> ScanTemplate(string templateName)
        {
            var scanInfo = new ScanTemplateInfo();
            var listInfo = new List<FormInformation>();

            if (string.IsNullOrEmpty(templateName))
            {
                return new EmptyResult();
            }

            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                var blobInfo = await TemplateManager.GetXsnBlobInfo(templateName, StorageContext);
                if (blobInfo == null)
                {
                    return new EmptyResult();
                }

                try
                {
                    FormInformation info = InfoPathAnalytics.FormInformation(blobInfo.FileStream);
                    info.XsnUrl = blobInfo.FileName;
                    listInfo.Add(info);
                }
                catch
                {
                    scanInfo.AddMessage(templateName);
                }
            }


            scanInfo.FormInfos = listInfo;

            return View("ScanTemplates", scanInfo);
        }

        private ActionResult RedirectToView(string url)
        {
            string qs = "";
            int indexOfQuestionMark = this.Request.RawUrl.IndexOf("?");
            if (indexOfQuestionMark >= 0)
            {
                qs = this.Request.RawUrl.Substring(indexOfQuestionMark);
            }
            else
            {
                qs = "?";
            }
            if (string.IsNullOrEmpty(url))
                return RedirectToDefaultView();

            if (url.EndsWith(".xsn"))
            {
                return Redirect("/Pages/ScanXSN.aspx" + qs + "&xsnUrl=" + url);
            }
            else
            {
                return Redirect("/Pages/ScanError.aspx");
            }
        }

        private ActionResult RedirectToDefaultView()
        {
            string qs = "";
            int indexOfQuestionMark = this.Request.RawUrl.IndexOf("?");
            if (indexOfQuestionMark >= 0)
                qs = this.Request.RawUrl.Substring(indexOfQuestionMark);

            return Redirect("/Pages/Scanner.aspx" + qs);
        }

        public static string MakeSiteRelativeUrl(string siteUrl, string itemUrl)
        {
            siteUrl = siteUrl.ToLower();
            itemUrl = itemUrl.ToLower();
            if (itemUrl.StartsWith(siteUrl))
            {
                itemUrl = itemUrl.Substring(siteUrl.Length);
            }
            return itemUrl;
        }

        [SharePointContextFilter]
        public ActionResult Documents(string libId)
        {
            var info = new DocumentInfo();
            Guid libraryId;

            if (!Guid.TryParse(libId, out libraryId))
            {
                info.AddMessage("Cannot get documents invalid library id.");
                return View(info);
            }

            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                try
                {
                    SP.Web web = clientContext.Web;

                    var library = web.Lists.GetById(libraryId);
                    clientContext.Load(library);
                    clientContext.ExecuteQuery();

                    if (!DocumentTypeBaseId.Any(id => id == library.BaseTemplate))
                    {
                        info.AddMessage("Cannot get documents invalid library.");
                        return View(info);
                    }

                    var camlQuery = new CamlQuery
                    {
                        ViewXml = "<View><Query><Where><Contains><FieldRef Name='FileLeafRef'/>" +
                        "<Value Type='String'>.xsn</Value>" +
                        "</Contains></Where></Query></View>"
                    };

                    var listItems = library.GetItems(camlQuery);
                    clientContext.Load(listItems);
                    clientContext.ExecuteQuery();

                    foreach (var item in listItems)
                    {
                        info.ItemInfo.Add(new ListItemInfo(item));
                    }
                    return View(info);
                }
                catch
                {
                    info.AddMessage("There was an error while getting documents.");
                    return View(info);
                }
            }
        }

        [SharePointContextFilter]
        public ActionResult ScanTemplates(List<string> urls)
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);
            var scanInfo = new ScanTemplateInfo();
            var listInfo = new List<FormInformation>();

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                foreach (var url in urls)
                {
                    try
                    {
                        SP.Web web = clientContext.Site.RootWeb;

                        var file = web.GetFileByServerRelativeUrl(url);

                        FormInformation info = InfoPathAnalytics.FormInformation(clientContext, file);
                        info.XsnUrl = file.ServerRelativeUrl;

                        listInfo.Add(info);
                    }
                    catch
                    {
                        scanInfo.AddMessage(url);
                    }
                }
            }
            scanInfo.FormInfos = listInfo;

            return View(scanInfo);
        }


        [AllowAnonymous]
        [HttpGet]
        public ViewResult Diagnostics()
        {
            return View();
        }

        [AllowAnonymous]
        [HttpPost]
        public ActionResult ScanForm()
        {
            var files = Request.Files;
            var username = Request.Params["username"];
            var email = Request.Params["email"];

            if (files == null || files.Count == 0 ||
                String.IsNullOrWhiteSpace(username) || String.IsNullOrWhiteSpace(email))
            {
                return new HttpStatusCodeResult(System.Net.HttpStatusCode.BadRequest);
            }

            HttpPostedFileBase file = files[0];

            FormInformation info = InfoPathAnalytics.FormInformation(file);
            info.Index = 1;
            UserDetail userDetail = new UserDetail
            {
                UserName = username,
                Email = email
            };

            SubmitDiagnosticsResult(userDetail, file, info);

            return View("DiagnosticsResult", info);
        }

        private void SubmitDiagnosticsResult(UserDetail userDetail, HttpPostedFileBase file, FormInformation info)
        {
            try
            {
                var dbxlTemplateName = ApplicationConstants.ScanDiagnosticsConstant.ScanDiagnosticsTemplateName;
                var dbxlUrl = ApplicationConstants.ScanDiagnosticsConstant.ScanDiagnosticsDbxlUrl;
                var dbxlUserName = ApplicationConstants.ScanDiagnosticsConstant.ScanDiagnosticsDbxlUserName;
                var dbxlPassword = ApplicationConstants.ScanDiagnosticsConstant.ScanDiagnosticsDbxlPassword;

                if (!String.IsNullOrWhiteSpace(dbxlTemplateName)
                    && !String.IsNullOrWhiteSpace(dbxlUrl)
                    && !String.IsNullOrWhiteSpace(dbxlUserName)
                    && !String.IsNullOrWhiteSpace(dbxlPassword))
                {
                    var scanTemplateXml = GetQdScanTemplateXml(info, userDetail);

                    var submitDocument = new SubmitDocument
                    {
                        docTypeName = dbxlTemplateName,
                        xml = scanTemplateXml,
                        name = file.FileName,
                        author = userDetail.UserName
                    };
                    var submitDocumentXml = GetSerializedXml<SubmitDocument>(submitDocument);

                    dbxlUrl = String.Format("{0}{1}qdabrawebservice/DbxlDocumentService.asmx", dbxlUrl, dbxlUrl.EndsWith("/") ? string.Empty : "/");

                    SoapHelper.CallSoapService(new SoapServiceRequest
                    {
                        data = submitDocumentXml,
                        overrideAction = false,
                        soapServiceAction = "http://qdabra.com/webservices/SubmitDocument",
                        url = dbxlUrl,
                        useCookie = false
                    },
                         new NetworkCredential(dbxlUserName, dbxlPassword));
                }
            }
            catch
            {
            }
        }

        private string GetQdScanTemplateXml(FormInformation info, UserDetail userDetail)
        {
            var qdScan = new QdScanTemplate
            {
                ResultInfo = info,
                UserInfo = userDetail
            };

            return GetSerializedXml<QdScanTemplate>(qdScan);
        }

        private string GetSerializedXml<T>(T data)
        {
            XmlSerializer serializer = new XmlSerializer(typeof(T));
            var settings = new XmlWriterSettings();
            settings.Indent = true;
            settings.OmitXmlDeclaration = true;

            using (StringWriter sWriter = new StringWriter())
            {
                using (XmlWriter xWriter = XmlWriter.Create(sWriter, settings))
                {
                    serializer.Serialize(xWriter, data);
                    return sWriter.ToString();
                }
            }
        }
    }
}
