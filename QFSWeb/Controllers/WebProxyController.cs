using Microsoft.SharePoint.Client;
using QFSWeb.Models;
using QFSWeb.Utilities;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Security;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Xml;
using System.Xml.Linq;
using QFSWeb.SharePoint;

namespace QFSWeb.Controllers
{
    #region Model

    public class SoapResult
    {
        public string resultBody;
        public bool success;
        public string message;
        public SoapFault fault;
    }

    public class SoapFault
    {
        public string faultcode;
        public string faultstring;
        public string detail;
    }

    public class NetworkCredentials
    {
        public string User { get; set; }
        public string Password { get; set; }
        public string Domain { get; set; }
    }

    public class SoapServiceRequest
    {
        public string url { get; set; }
        public string soapServiceAction { get; set; }
        public string data { get; set; }
        public bool overrideAction { get; set; }
        public bool useCookie { get; set; }
        public NetworkCredentials Credentials { get; set; }
    }

    public class SharePointRequest
    {
        /// <summary>
        /// Upload Url location.
        /// </summary>
        public string location { get; set; }

        /// <summary>
        /// File name to be uploaded.
        /// </summary>
        public string fileName { get; set; }

        /// <summary>
        /// File string.
        /// </summary>
        public string file { get; set; }

        /// <summary>
        /// Overwrite existing file.
        /// </summary>
        public bool overwrite { get; set; }

        /// <summary>
        /// Is Base64 string.
        /// </summary>
        public bool isBase64 { get; set; }
    }

    public class CrossDomainRequest
    {
        /// <summary>
        /// Content to upload.
        /// </summary>
        public string Content { get; set; }

        /// <summary>
        /// Request Content-type.
        /// </summary>
        public string ContentType { get; set; }

        /// <summary>
        /// Request method type.
        /// </summary>
        public string Method { get; set; }

        /// <summary>
        /// Request Password if authentication required.
        /// </summary>
        public string Password { get; set; }

        /// <summary>
        /// Request url.
        /// </summary>
        public string Url { get; set; }

        /// <summary>
        /// Request Username if authentication required.
        /// </summary>
        public string Username { get; set; }
    }

    public class SharePointBase
    {
        public string siteUrl { get; set; }

        public string listRelativeUrl { get; set; }

        public string listId { get; set; }

        public string listName { get; set; }

        public bool useName { get; set; }
    }

    public class FilterField
    {
        public string internalName { get; set; }

        public string type { get; set; }
    }

    public class Filter
    {
        public FilterField field { get; set; }

        public string value { get; set; }
    }

    public class SharePointQuery : SharePointBase
    {
        public bool sortAsc { get; set; }
        public string sortBy { get; set; }
        public IEnumerable<string> Fields { get; set; }
        public IEnumerable<Filter> filterFields { get; set; }
    }

    public class SPListItem
    {
        public string internalName { get; set; }
        public object value { get; set; }
        public bool isDateTime { get; set; }
        public bool isFieldUserValue { get; set; }
        public bool isFieldLookupValue { get; set; }
        public bool isRichText { get; set; }
        public bool isId { get; set; }
    }

    public class ListItemContainer
    {
        public int Id { get; set; }

        public List<SPListItem> fieldArray { get; set; }
    }

    public class CreateItemContainer : SharePointBase
    {
        public List<ListItemContainer> itemArray { get; set; }

    }

    #endregion

    public class WebProxyController : Controller
    {
        public WebProxyController()
        {
        }

        [SharePointContextFilter]
        [ValidateInput(false)]
        public ActionResult CallSoapService(SoapServiceRequest request)
        {
            return InternalCallSoapService(request);
        }

        public ActionResult CallSoapServiceAnon(SoapServiceRequest request)
        {
            return InternalCallSoapService(request);
        }

        [SharePointContextFilter]
        public ActionResult CallRestService(string url)
        {
            var success = false;
            var message = string.Empty;
            var resultBody = string.Empty;

            if (!String.IsNullOrWhiteSpace(url))
            {
                var appInstance = SqlCredentialManager.GetMatchingInstanceByUrl(url);

                var isCredentialsExist = appInstance != null &&
                    !String.IsNullOrWhiteSpace(appInstance.Username)
                    && !String.IsNullOrWhiteSpace(appInstance.Password);

                using (var webClient = new WebClient())
                {
                    try
                    {
                        if (isCredentialsExist)
                        {
                            webClient.Credentials = new NetworkCredential(appInstance.Username, appInstance.Password, appInstance.Domain);
                        }

                        resultBody = webClient.DownloadStringDetectEncoding(url);
                        success = true;
                    }
                    catch (Exception ex)
                    {
                        message = String.Format("{0} : {1}", ex.GetType().ToString(), ex.Message);
                    }
                }
            }
            else
            {
                message = "Url cannot be blank.";
            }

            var restResult = new RestResult
                {
                    Message = message,
                    ResultBody = resultBody,
                    Success = success
                };

            return Json(restResult, JsonRequestBehavior.AllowGet);
        }

        [SharePointContextFilter]
        public ActionResult SubmitToLibrary(SharePointRequest request)
        {
            var libraryLocation = request.location;
            var soapResult = new SoapResult();
            if (String.IsNullOrWhiteSpace(request.file) || String.IsNullOrWhiteSpace(request.fileName) || String.IsNullOrWhiteSpace(libraryLocation))
            {
                soapResult = new SoapResult
                {
                    message = "Location, file name and xml data are required."
                };
                return Json(soapResult, JsonRequestBehavior.AllowGet);
            }

            var isUploaded = false;
            var message = string.Empty;
            var errorMessage = string.Empty;

            try
            {
                using (var clientContext = GetClientContext(libraryLocation, true))
                {
                    var docLibrary = GetLibrary(libraryLocation, clientContext, out errorMessage);
                    if (docLibrary != null)
                    {
                        var fileUrl = String.Format("{0}/{1}", docLibrary.ServerRelativeUrl, request.fileName);
                        var file = GetFile(clientContext, fileUrl, out errorMessage);

                        if (file == null || request.overwrite)
                        {
                            isUploaded = UploadFile(
                                request.file, 
                                docLibrary.ServerRelativeUrl, 
                                request.fileName, 
                                request.overwrite, 
                                request.isBase64,
                                clientContext.Url, 
                                clientContext,
                                out errorMessage);

                            message = isUploaded
                                ? "The file was uploaded successfully."
                                : String.Format("The file could not be uploaded to {0}", request.location);
                        }
                        else
                        {
                            message = String.Format("File already exists at {0}", request.location);
                        }
                    }
                    else
                    {
                        message = String.Format("Document library not found: {0}", request.location);
                    }
                }
            }
            catch (Exception ex)
            {
                message = String.Format("The file could not be uploaded to {0}", request.location);
                errorMessage += ex.ToString();
            }

            soapResult.success = isUploaded;
            soapResult.message = message;
            soapResult.resultBody = errorMessage;

            return Json(soapResult, JsonRequestBehavior.AllowGet);
        }

        public ActionResult CallCrossDomain(CrossDomainRequest request)
        {
            SoapResult soapResult;
            if (request == null || String.IsNullOrWhiteSpace(request.Url))
            {
                soapResult = new SoapResult
                {
                    message = "Request url cannot be empty."
                };
                return Json(soapResult, JsonRequestBehavior.AllowGet);
            }

            var responseData = string.Empty;
            var errorMessage = string.Empty;
            try
            {
                var userName = request.Username;
                var password = request.Password;
                var content = request.Content;
                var webClient = new WebClient();

                if (!String.IsNullOrWhiteSpace(userName) && !String.IsNullOrWhiteSpace(password))
                {
                    webClient.Credentials = new NetworkCredential(userName, password);
                }
                else
                {
                    webClient.UseDefaultCredentials = true;
                }

                if (!String.IsNullOrWhiteSpace(request.ContentType))
                {
                    webClient.Headers[HttpRequestHeader.ContentType] = request.ContentType;
                }

                if (!String.IsNullOrWhiteSpace(content))
                {
                    responseData = webClient.UploadString(request.Url, request.Method, content);
                }
                else
                {
                    responseData = webClient.DownloadStringDetectEncoding(request.Url);
                }
            }
            catch (Exception ex)
            {
                errorMessage = "There was an error while performing this operation.";
                responseData = ex.ToString();
            }

            soapResult = new SoapResult
            {
                message = errorMessage,
                resultBody = responseData,
                success = String.IsNullOrWhiteSpace(errorMessage)
            };

            return Json(soapResult, JsonRequestBehavior.AllowGet);
        }

        [SharePointContextFilter]
        public ActionResult SharePointFile(string path)
        {
            try
            {
                var hostUrl = SpManager.GetHostParam(HttpContext.Request);

                using (var clientContext = GetClientContext(hostUrl))
                {
                    var file = clientContext.Web.GetFileByServerRelativeUrl(path);

                    var clientStream = file.OpenBinaryStream();

                    clientContext.Load(file);
                    clientContext.ExecuteQuery();

                    using (var stream = clientStream.Value)
                    using (var reader = new StreamReader(stream))
                    {
                        var contents = reader.ReadToEnd();

                        return new ObjectResult<object>(GetJsonResponse(data: contents));
                    }
                }
            }
            catch (Exception e)
            {
                return Json(new { error = e.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [SharePointContextFilter]
        public ActionResult QueryList(SharePointQuery spQuery)
        {
            try
            {
                if (spQuery == null)
                {
                    return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Query cannot be null.");
                }

                var siteUrl = spQuery.siteUrl;
                var fields = spQuery.Fields;
                var listId = spQuery.listId;
                var listName = spQuery.listName;
                var filterFields = spQuery.filterFields;

                if (String.IsNullOrWhiteSpace(siteUrl)
                  || fields == null || !fields.Any()
                  || String.IsNullOrWhiteSpace(listId) && String.IsNullOrWhiteSpace(listName))
                {
                    return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Query missing parameters.");
                }

                fields = fields.Distinct();
                using (var clientContext = GetClientContext(siteUrl))
                {
                    var spWeb = clientContext.Web;
                    var spList = !String.IsNullOrWhiteSpace(spQuery.listId)
                        ? spWeb.Lists.GetById(Guid.Parse(listId))
                        : spWeb.Lists.GetByTitle(listName);

                    var camlQuery = GenerateCamlQuery(fields, filterFields, spQuery.sortBy, spQuery.sortAsc);

                    var listItems = spList.GetItems(camlQuery);
                    var listFields = spList.Fields;

                    clientContext.Load(listFields, f => f.Include(x => x.InternalName, x => x.FieldTypeKind, x => x.Title));
                    clientContext.Load(listItems);
                    clientContext.ExecuteQuery();

                    var fieldTypeArray = (from field in fields
                                          let listField = listFields.Where(lf => lf.InternalName == field || lf.Title == field)
                                          where listField.Any()
                                          select new
                                          {
                                              Key = field,
                                              Value = listField.First().FieldTypeKind
                                          })
                                          .ToDictionary(x => x.Key, x => x.Value);

                    var itemArray = new List<ListItemContainer>();
                    var index = 0;
                    foreach (var item in listItems)
                    {
                        index++;
                        var dictionary = new Dictionary<int, object>();
                        var spListItems = new List<SPListItem>();
                        foreach (var field in fields)
                        {
                            var spListItem = new SPListItem
                            {
                                internalName = field,
                                value = item[field],
                                isDateTime = fieldTypeArray[field] == FieldType.DateTime,
                                isFieldUserValue = fieldTypeArray[field] == FieldType.User,
                                isFieldLookupValue = fieldTypeArray[field] == FieldType.Lookup,
                                isRichText = fieldTypeArray[field] == FieldType.Note
                            };

                            spListItems.Add(spListItem);
                        }

                        var container = new ListItemContainer
                        {
                            Id = index,
                            fieldArray = spListItems
                        };

                        itemArray.Add(container);
                    }

                    return Json(itemArray, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return new HttpStatusCodeResult(HttpStatusCode.InternalServerError, ex.Message);
            }
        }

        [SharePointContextFilter]
        public ActionResult SubmitToList(CreateItemContainer container)
        {
            if (container == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var siteUrl = container.siteUrl;
            var items = container.itemArray;
            var listId = container.listId;
            var listName = container.listName;

            if (String.IsNullOrWhiteSpace(siteUrl) ||
                items == null || items.Count == 0 ||
            (String.IsNullOrWhiteSpace(listId) && String.IsNullOrWhiteSpace(listName)))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            try
            {
                using (var clientContext = GetClientContext(siteUrl))
                {
                    var spWeb = clientContext.Web;
                    var spList = !container.useName
                        ? spWeb.Lists.GetById(Guid.Parse(listId))
                        : spWeb.Lists.GetByTitle(listName);
                    List<ListItem> listItems = new List<ListItem>();


                    foreach (var item in items)
                    {
                        ListItem spListItem;
                        if (item.Id == 0)
                        {
                            var listItem = new ListItemCreationInformation();
                            spListItem = spList.AddItem(listItem);
                        }
                        else
                        {
                            spListItem = spList.GetItemById(item.Id);
                        }

                        foreach (var field in item.fieldArray)
                        {
                            if (!field.isId && !String.IsNullOrWhiteSpace(field.internalName))
                            {
                                spListItem[field.internalName] = field.value;
                            }
                        }

                        listItems.Add(spListItem);
                        spListItem.Update();
                    }

                    clientContext.ExecuteQuery();

                    for (int index = 0; index < listItems.Count; index++)
                    {
                        if (items[index].Id == 0)
                        {
                            items[index].Id = listItems[index].Id;
                        }
                    }
                }

                return Json(items, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return new HttpStatusCodeResult(HttpStatusCode.InternalServerError, ex.Message);
            }
        }

        [SharePointContextFilter]
        public ActionResult GetUdcxContents(string udcxPath)
        {
            if (String.IsNullOrWhiteSpace(udcxPath))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Path cannot be empty.");
            }

            try
            {
                using (var webClient = new WebClient())
                {
                    var credentials = GetCredentials(udcxPath);
                    if (credentials != null)
                    {
                        webClient.Credentials = credentials;
                    }

                    webClient.Headers.Add("X-FORMS_BASED_AUTH_ACCEPTED", "f");
                    var data = webClient.DownloadStringDetectEncoding(udcxPath);

                    return Json(GetJsonResponse(data: data), JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(GetJsonResponse(success: false, error: ex.Message), JsonRequestBehavior.AllowGet);
            }
        }

        [SharePointContextFilter]
        public JsonResult KeepAlive()
        {
            Trace.TraceInformation("KeepAlive");

            HttpContext.Session["KeepAlive"] = DateTime.UtcNow;

            return Json(true, JsonRequestBehavior.AllowGet);
        }

        [SharePointContextFilter]
        [HttpGet]
        public JsonResult GetRootSiteUrl()
        {
            string rootSiteUrl = null;
            var isSuccess = false;
            try
            {
                var hostUrl = SpManager.GetHostParam(HttpContext.Request);

                using (var clientContext = GetClientContext(hostUrl))
                {
                    var site = clientContext.Site;
                    clientContext.Load(site);
                    clientContext.ExecuteQuery();

                    rootSiteUrl = site.Url;
                }

                isSuccess = true;
            }
            catch (Exception ex)
            {
                rootSiteUrl = ex.StackTrace;
            }

            return Json(new
            {
                Success = isSuccess,
                Url = rootSiteUrl
            }, JsonRequestBehavior.AllowGet);
        }

        [SharePointContextFilter]
        [HttpPost]
        public async Task<ActionResult> ExecuteAdoAdapter(string connectionString, string commandText)
        {
            if (!ApplicationConstants.DataConnectionConstant.EnableSqlDataConnection)
            {
                return SendAdoDataResult(new AdoDataResult
                {
                    Error = "Database connections are not supported."
                });
            }

            if (String.IsNullOrWhiteSpace(connectionString) || String.IsNullOrWhiteSpace(commandText))
            {
                return SendAdoDataResult(new AdoDataResult
                {
                    Error = "Cannot execute query, Connection string and Command text are required"
                });
            }

            return SendAdoDataResult(await IPAdoAdapter.ExecuteAdoAdapterAsync(connectionString, commandText));
        }

        [SharePointContextFilter]
        [HttpPost]
        public ActionResult CreateSharePointFolder(string siteUrl, string libraryName, string folderName)
        {
            if (String.IsNullOrWhiteSpace(siteUrl) || String.IsNullOrWhiteSpace(libraryName) || String.IsNullOrWhiteSpace(folderName))
            {
                var failResult = new
                {
                    error = "Cannot create SharePoint folder. Site url, Library name and Folder name are required"
                };

                return new ObjectResult<object>(failResult);
            }

            string errorMessage;
            var success = false;

            using (var clientContext = GetClientContext(siteUrl))
            {
                success = SPHelper.CreateSharePointFolder(clientContext, libraryName, folderName, out errorMessage);
            }
            var result = new
            {
                success = success,
                error = errorMessage
            };

            return new ObjectResult<object>(result);
        }

        private ActionResult SendAdoDataResult(AdoDataResult dataResult)
        {
            return new ObjectResult<AdoDataResult>(dataResult);
        }

        #region Private Methods

        private ActionResult InternalCallSoapService(SoapServiceRequest request)
        {
            // TODO: Add SSO handling

            SoapResult result = new SoapResult();

            try
            {
                // 2017/03/02 -- Move the code to SoapHelper.
                var uploadResult = SoapHelper.CallSoapService(request, GetCredentials(request.url));

                result.resultBody = GetBodyFromSoapResult(uploadResult);
                result.success = true;
            }
            catch (WebException ex)
            {
                if (ex.Response == null)
                {
                    result.message = String.Format("The request to the service failed with an error: {0}", ex.Message);
                }
                else
                {
                    var fault = GetSoapFault(ex);
                    result.fault = fault;

                    result.message = !String.IsNullOrWhiteSpace(fault.faultstring)
                        ? String.Format("The service failed with an error: {0}", fault.faultstring)
                        : String.Format("The request failed with status {0}", fault.faultcode);
                }
            }
            catch (Exception ex)
            {
                result.message = String.Format("The request to the service failed with an error: {0}", ex.Message);
            }
            return new ObjectResult<SoapResult>(result);
        }

        private static HttpWebRequest CreateWebRequest(string url, string action)
        {
            HttpWebRequest webRequest = (HttpWebRequest)WebRequest.Create(url);
            webRequest.Headers.Add("SOAPAction", action);
            webRequest.ContentType = @"text/xml;charset=""utf-8""";
            webRequest.Accept = "text/xml";
            webRequest.Method = "POST";
            return webRequest;
        }

        private static XmlDocument CreateSoapEnvelope(string data)
        {
            XmlDocument soapEnvelop = new XmlDocument();
            string fmt = @"<soap:Envelope xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/"" xmlns:xsi=""http://www.w3.org/1999/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/1999/XMLSchema""><soap:Body>{0}</soap:Body></soap:Envelope>";
            string xmlBody = string.Format(fmt, data);
            soapEnvelop.LoadXml(xmlBody);
            return soapEnvelop;
        }

        private static void InsertSoapEnvelopeIntoWebRequest(XmlDocument soapEnvelopeXml, HttpWebRequest webRequest)
        {
            using (Stream stream = webRequest.GetRequestStream())
            {
                soapEnvelopeXml.Save(stream);
            }
        }

        private static string GetBodyFromSoapResult(string soapResult)
        {
            var doc = new XmlDocument();
            doc.LoadXml(soapResult);

            var nsmgr = new XmlNamespaceManager(doc.NameTable);
            nsmgr.AddNamespace("soap", "http://schemas.xmlsoap.org/soap/envelope/");

            var node = doc.SelectSingleNode("/soap:Envelope/soap:Body", nsmgr);
            return node != null ? node.InnerXml : "";
        }

        private SoapFault GetSoapFault(System.Net.WebException wex)
        {
            SoapFault sf = new SoapFault();
            try
            {
                using (StreamReader responseReader = new StreamReader(wex.Response.GetResponseStream()))
                {
                    var faultMessage = responseReader.ReadToEnd();

                    XmlDocument xdoc = new XmlDocument();
                    xdoc.LoadXml(faultMessage);
                    XmlNode node = null;

                    node = xdoc.SelectSingleNode("//faultcode");
                    if (node != null) sf.faultcode = node.InnerText;

                    node = xdoc.SelectSingleNode("//faultstring");
                    if (node != null) sf.faultstring = node.InnerText;

                    node = xdoc.SelectSingleNode("//detail");
                    if (node != null) sf.detail = node.InnerText;
                }
            }
            catch
            {
                sf.faultcode = GetExceptionStatusCode(wex);
            }

            return sf;
        }

        private string GetExceptionStatusCode(WebException wex)
        {
            var httpWebResponse = wex.Response as HttpWebResponse;

            return ((int)httpWebResponse.StatusCode).ToString();
        }

        private static bool UploadFile(string fileString, string libraryServerRelativeUrl,
            string fileName, bool overwrite, bool isBase64, string hostUrl, ClientContext context, out string errorMessage)
        {
            errorMessage = string.Empty;
            try
            {
                var fileBytes = isBase64
                    ? Convert.FromBase64String(fileString)
                    : Encoding.UTF8.GetBytes(fileString);
                var libraryItemUrl =
                    String.Format(
                        "{0}/_api/web/GetFolderByServerRelativeUrl('{1}')/Files/add(url='{2}',overwrite=true)",
                    hostUrl, 
                    libraryServerRelativeUrl, 
                    fileName);

                var endpointRequest = (HttpWebRequest)WebRequest.Create(libraryItemUrl);
                endpointRequest.Method = "POST";
                endpointRequest.Headers.Add("binaryStringRequestBody", "true");
                PrepareAuthentication(endpointRequest, context);
                endpointRequest.GetRequestStream().Write(fileBytes, 0, fileBytes.Length);

                var endpointResponse = (HttpWebResponse)endpointRequest.GetResponse();

                return true;
            }
            catch (WebException wex)
            {
                errorMessage = wex.ToString();

#if DEBUG
                if (wex.Response != null)
                {
                    using (var responseStream = wex.Response.GetResponseStream())
                    using (var streamReader = new StreamReader(responseStream))
                    {
                        var response = streamReader.ReadToEnd();
                    }
                }
#endif

                return false;
            }
            catch (Exception ex)
            {
                errorMessage = ex.ToString();
                return false;
            }
        }

        private static readonly XName FormDigestValueName = XName.Get("FormDigestValue",
            "http://schemas.microsoft.com/ado/2007/08/dataservices");

        private static string GetDigest(string siteUrl, string cookie)
        {
            var request = WebRequest.Create(siteUrl + "/_api/contextinfo");
            request.Method = "POST";
            request.ContentLength = 0;
            request.Headers.Add("cookie", cookie);

            var response = request.GetResponse();

            using (var stream = response.GetResponseStream())
            {
                var xd = XDocument.Load(stream);

                return xd
                    .Descendants()
                    .First(e =>e.Name == FormDigestValueName)
                    .Value;
            }
        }

        private static void PrepareAuthentication(HttpWebRequest request, ClientContext context)
        {
            var qfsContext = context as QfsClientContext;
            if (qfsContext != null)
            {
                request.Headers.Add("Authorization", "Bearer " + qfsContext.AccessToken);
                return;
            }

            request.Headers.Add("X-FORMS_BASED_AUTH_ACCEPTED", "f");

            var spCredential = context.Credentials as SharePointOnlineCredentials;
            if (spCredential != null)
            {
                var cookie = spCredential.GetAuthenticationCookie(request.RequestUri);
                request.Headers.Add("cookie", cookie);
                request.Headers.Add("X-RequestDigest", GetDigest(context.Url, cookie));
            }
            else
            {
                request.Credentials = context.Credentials;
            }
        }

        private static Microsoft.SharePoint.Client.File GetFile(ClientContext clientContext, string fileUrl, out string errorMessage)
        {
            errorMessage = string.Empty;
            try
            {
                var file = clientContext.Web.GetFileByServerRelativeUrl(fileUrl);
                clientContext.Load(file);
                clientContext.ExecuteQuery();
                return file;
            }
            catch (Exception ex)
            {
                errorMessage = ex.ToString();
                return null;
            }
        }

        private static Folder GetLibrary(string libraryLocation, ClientContext clientContext, out string errorMessage)
        {
            errorMessage = string.Empty;
            try
            {
                var docLibrary = clientContext.Web.GetFolderByServerRelativeUrl(libraryLocation);
                clientContext.Load(docLibrary);
                clientContext.ExecuteQuery();
                return docLibrary;
            }
            catch (Exception ex)
            {
                errorMessage = ex.ToString();
                return null;
            }
        }

        private ClientContext GetClientContext(string location, bool isLibrarySubmit = false)
        {
            var appInstance = SqlCredentialManager.GetMatchingInstanceByUrl(location);

            var isValidInstance = appInstance != null &&
                !String.IsNullOrWhiteSpace(appInstance.Username) &&
                !String.IsNullOrWhiteSpace(appInstance.Password);

            var webUrl = isLibrarySubmit
                ? GetWebUrl(location)
                : location;

            if (!isValidInstance)
            {
                return SpManager.GetSharePointContext(HttpContext, webUrl);
            }

            var credentials = GetCredentials(webUrl, appInstance);

            var clientContext = new ClientContext(webUrl);
            clientContext.Credentials = credentials;

            return clientContext;
        }

        private string GetWebUrl(string libraryLocation)
        {
            if (libraryLocation[libraryLocation.Length - 1] == '/')
            {
                libraryLocation = libraryLocation.Remove(libraryLocation.Length - 1);
            }

            var splitIndex = libraryLocation.LastIndexOf("/");

            var webUrl = libraryLocation.Substring(0, splitIndex);

            return webUrl;
        }

        private static CamlQuery GenerateCamlQuery(IEnumerable<string> fields, IEnumerable<Filter> filterFields, string sortBy, bool sortAsc)
        {
            var camlQuery = new CamlQuery
            {
                ViewXml = "<View><Query><ViewFields>" +
                String.Join(string.Empty, fields.Select(field => String.Format("<FieldRef Name=\"{0}\"/>", field))) +
                "</ViewFields>"
            };

            if (filterFields != null && filterFields.Any())
            {
                var filterFieldsLength = filterFields.Count();

                var filterQuery = String.Join(string.Empty, filterFields.Skip(1).Select(x => "<And>"));

                filterQuery += CreateFilter(filterFields.First());

                foreach (var field in filterFields.Skip(1))
                {
                    filterQuery += String.Format("{0}</And>", CreateFilter(field));
                }

                filterQuery = String.Format("<Where>{0}</Where>", filterQuery);


                camlQuery.ViewXml += filterQuery;
            }

            if (!String.IsNullOrWhiteSpace(sortBy))
            {
                var orderQuery = String.Format("<OrderBy><FieldRef Name=\"{0}\" Ascending=\"{1}\" /></OrderBy>",
                    sortBy, sortAsc.ToString().ToUpper());
                camlQuery.ViewXml += orderQuery;
            }

            camlQuery.ViewXml += "</Query></View>";
            return camlQuery;
        }

        private static string CreateFilter(Filter field)
        {
            return String.Format("<Eq><FieldRef Name='{0}' /><Value Type='{1}'>{2}</Value></Eq>",
                                    field.field.internalName, field.field.type, field.value);
        }

        private ICredentials GetCredentials(string spUrl)
        {
            var appInstance = SqlCredentialManager.GetMatchingInstanceByUrl(spUrl);

            var isValidInstance = appInstance != null &&
                !String.IsNullOrWhiteSpace(appInstance.Username) &&
                !String.IsNullOrWhiteSpace(appInstance.Password);

            if (!isValidInstance)
            {
                return null;
            }

            return GetCredentials(spUrl, appInstance);
        }

        private ICredentials GetCredentials(string spUrl, Models.AppInstance appInstance)
        {
            var password = GetSecureStringPassword(appInstance.Password);

            var url = new Uri(spUrl);

            if (url.Host.EndsWith("sharepoint.com", StringComparison.InvariantCultureIgnoreCase))
            {
                return new SharePointOnlineCredentials(appInstance.Username, password);
            }

            return new NetworkCredential(appInstance.Username, password);
        }

        private SecureString GetSecureStringPassword(string password)
        {
            var securePassword = new SecureString();
            foreach (char c in password.ToCharArray())
            {
                securePassword.AppendChar(c);
            }

            return securePassword;
        }

        private object GetJsonResponse(Exception e)
        {
            if (e == null)
            {
                return GetJsonResponse(success: false, error: "Unknown error");
            }

#if DEBUG
            var stack = e.StackTrace;
#else
            string stack = null;
#endif

            return GetJsonResponse(
                success: false,
                error: e.Message,
                stack: stack
            );
        }

        private object GetJsonResponse(bool success = true, string data = null, string error = null, string stack = null)
        {
            return new
            {
                Success = success,
                Data = data,
                Error = error
            };
        }

        # endregion
    }
}