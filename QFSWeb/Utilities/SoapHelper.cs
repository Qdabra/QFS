using Microsoft.SharePoint.Client;
using QFSWeb.Controllers;
using System;
using System.Net;
using System.Security;
using System.Text;

namespace QFSWeb.Utilities
{
    public static class SoapHelper
    {
        public static string CallSoapService(SoapServiceRequest request, ICredentials credentials = null)
        {
            var xmlDataBuilder = new StringBuilder(@"<?xml version=""1.0"" encoding=""utf-8""?>");
            xmlDataBuilder.Append(@"<soap:Envelope xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/""");
            xmlDataBuilder.Append(@" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"">");
            xmlDataBuilder.AppendFormat("<soap:Body>{0}</soap:Body>", request.data);
            xmlDataBuilder.Append("</soap:Envelope>");

            using (var webClient = new WebClient())
            {
                SetCredentials(request, credentials, webClient);

                webClient.Headers.Add("content-type", "text/xml; charset=\"utf-8\"");
                webClient.Headers.Add(HttpRequestHeader.UserAgent, "Mozilla/4.0 (compatible; MSIE 6.0; MS Web Services Client Protocol 2.0.50727.8009)");

                if (request.overrideAction && !String.IsNullOrWhiteSpace(request.soapServiceAction))
                {
                    webClient.Headers.Add("SOAPAction", request.soapServiceAction);
                }

                return webClient.UploadStringDetectEncoding(request.url, xmlDataBuilder.ToString());

                // 2015/06/12 -- Removed approach using Webrequest.
            }
        }

        private static void SetCredentials(SoapServiceRequest request, ICredentials credentials, WebClient webClient)
        {
            if (credentials != null)
            {
                if (request.useCookie)
                {
                    var spCredential = credentials as SharePointOnlineCredentials;
                    if (spCredential != null)
                    {
                        var cookie = spCredential.GetAuthenticationCookie(new Uri(request.url));
                        webClient.Headers.Add("cookie", cookie);
                    }
                    else
                    {
                        webClient.Credentials = credentials;
                    }
                }
                else
                {
                    webClient.Credentials = credentials;
                }
            }
        }
    }
}