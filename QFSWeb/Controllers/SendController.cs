using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using SP = Microsoft.SharePoint.Client;
using BlobUtils;
using QueueUtils;
using PdfRequestUtils;

namespace QFSWeb.Controllers
{
    public class HtmlToPDFRequest
    {
        public string html { get; set; }
        public string toEmail { get; set; }
        public string emailBody { get; set; }
        bool isHtmlBody { get; set; }
    }

    public class SendController : Controller
    {
        static SendController()
        {
            try
            {
                RequestUtil.EnsureRequestTable();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("SendController exception: " + ex.ToString());
            }
        }

        //
        // GET: /Send/
        public ActionResult Index()
        {
            return View();
        }

        [SharePointContextFilter]
        public ActionResult Authenticate()
        {
            return Content("Authentication succeeded");
        }

        [ValidateInput(false)]
        [SharePointContextFilter]
        public ActionResult EmailPDF(string formXml, string viewXsl, string toEmail, string emailBody)
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                SP.User spUser = GetSharePointUser(clientContext);

                string internalUserID = null;

                // Store data for processing
                string tenantID = TokenHelper.GetRealmFromTargetUrl(new Uri(clientContext.Url));
                RequestIdentifier rid = RequestUtil.AddRequestEntity(PdfRequestType.EmailPDF, PdfRequestStatus.InProgress, tenantID, internalUserID);

                PDFRequest response = new PDFRequest();
                response.RequestID = rid.ID;
                response.RequestType = PdfRequestType.EmailPDF;
                response.Status = PdfRequestStatus.InProgress;
                response.Message = "";

                BlobUtil bu = null;
                try
                {
                    bu = new BlobUtil();

                    ParameterCollection plist = new ParameterCollection();
                    plist.Add(Parameters.Api, "EmailPDF");
                    plist.Add(Parameters.UserID, internalUserID);
                    plist.Add(Parameters.FromEmail, spUser.Email);
                    plist.Add(Parameters.ToEmail, toEmail ?? "");
                    plist.Add(Parameters.EmailBody, emailBody ?? "");

                    BlobCollection bc = new BlobCollection();
                    bc.Add("xml", formXml ?? "");
                    bc.Add("xsl", viewXsl ?? "");
                    bc.Add("parameters", plist);
                    bu.StoreRequestArguments(rid.ID, bc);

                    // post to queue
                    PdfServiceQueues.XmlToHtmlClient.AddMessage(rid.ID, internalUserID);
                }
                catch (Exception ex)
                {
                    // Update request status 
                    response.Status = PdfRequestStatus.Error;
                    response.Message = ex.Message;
                    RequestUtil.UpdateRequestStatus(rid.ID, PdfRequestStatus.Error, ex.Message);
                    //PdfServiceQueues.EmailSendClient.AddErrorMessage(requestID, internalUserID.Value, ex.Message);
                }
                finally
                {
                }
                return new ObjectResult<PDFRequest>(response);
            }
        }

        [ValidateInput(false)]
        [SharePointContextFilter]
        public ActionResult SendPDF(string formXml, string xsnName, string viewName, string toEmail, string emailBody)
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                SP.User spUser = GetSharePointUser(clientContext);

                string internalUserID = null;

                // Store data for processing
                string tenantID = TokenHelper.GetRealmFromTargetUrl(new Uri(clientContext.Url));
                RequestIdentifier rid = RequestUtil.AddRequestEntity(PdfRequestType.SendPDF, PdfRequestStatus.InProgress, tenantID, internalUserID);

                PDFRequest response = new PDFRequest();
                response.RequestID = rid.ID;
                response.RequestType = PdfRequestType.SendPDF;
                response.Status = PdfRequestStatus.InProgress;
                response.Message = "";

                BlobUtil bu = null;
                try
                {
                    bu = new BlobUtil();

                    ParameterCollection plist = new ParameterCollection();
                    plist.Add(Parameters.Api, "SendPDF");
                    plist.Add(Parameters.ViewName, viewName ?? "");
                    plist.Add(Parameters.UserID, internalUserID);
                    plist.Add(Parameters.XsnName, xsnName ?? "");
                    plist.Add(Parameters.FromEmail, spUser.Email ?? "");
                    plist.Add(Parameters.ToEmail, toEmail ?? "");
                    plist.Add(Parameters.EmailBody, emailBody ?? "");

                    BlobCollection bc = new BlobCollection();
                    bc.Add("xml", formXml);
                    bc.Add("parameters", plist);
                    bu.StoreRequestArguments(rid.ID, bc);

                    // post to queue
                    PdfServiceQueues.XmlToHtmlClient.AddMessage(rid.ID, internalUserID);
                }
                catch (Exception ex)
                {
                    // Update request status 
                    response.Status = PdfRequestStatus.Error;
                    response.Message = ex.Message;
                    RequestUtil.UpdateRequestStatus(rid.ID, PdfRequestStatus.Error, ex.Message);
                    //PdfServiceQueues.EmailSendClient.AddErrorMessage(requestID, internalUserID.Value, ex.Message);
                }
                finally
                {
                }
                return new ObjectResult<PDFRequest>(response);
            }
        }

        [ValidateInput(false)]
        [SharePointContextFilter]
        public ActionResult HtmlToPDF(string html, string toEmail, string emailBody, bool isHtmlBody)
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                SP.User spUser = GetSharePointUser(clientContext);

                string internalUserID = null;

                // Store data for processing
                string tenantID = TokenHelper.GetRealmFromTargetUrl(new Uri(clientContext.Url));
                RequestIdentifier rid = RequestUtil.AddRequestEntity(PdfRequestType.HtmlToPDF, PdfRequestStatus.InProgress, tenantID, internalUserID);

                PDFRequest response = new PDFRequest();
                response.RequestID = rid.ID;
                response.RequestType = PdfRequestType.HtmlToPDF;
                response.Status = PdfRequestStatus.InProgress;
                response.Message = "";

                BlobUtil bu = null;
                try
                {
                    bu = new BlobUtil();

                    ParameterCollection plist = new ParameterCollection();
                    plist.Add(Parameters.Api, "HtmlToPDF");
                    plist.Add(Parameters.UserID, internalUserID);
                    plist.Add(Parameters.FromEmail, spUser.Email);
                    plist.Add(Parameters.ToEmail, toEmail ?? "");
                    plist.Add(Parameters.EmailBody, emailBody ?? "");
//                    plist.Add(Parameters.isBodyHtml, isHtmlBody);

                    BlobCollection bc = new BlobCollection();
                    bc.Add("view.html", html);
                    bc.Add("parameters", plist);
                    bu.StoreRequestArguments(rid.ID, bc);

                    // post to queue
                    PdfServiceQueues.HtmlToPdfClient.AddMessage(rid.ID, internalUserID);
                }
                catch (Exception ex)
                {
                    // Update request status 
                    response.Status = PdfRequestStatus.Error;
                    response.Message = ex.Message;
                    RequestUtil.UpdateRequestStatus(rid.ID, PdfRequestStatus.Error, ex.Message);
                    PdfServiceQueues.EmailSendClient.AddErrorMessage(rid.ID, internalUserID, ex.Message);
                }
                finally
                {
                }
                return new ObjectResult<PDFRequest>(response);
            }
        }

        private SP.User GetSharePointUser(SP.ClientContext clientContext)
        {
            SP.User spUser = null;
            if (clientContext != null)
            {
                spUser = clientContext.Web.CurrentUser;
                clientContext.Load(spUser, user => user.Title, 
                    user => user.Email, 
                    user => user.IsSiteAdmin,
                    user => user.LoginName);
                clientContext.ExecuteQuery();
            }
            return spUser;
        }
	}
}