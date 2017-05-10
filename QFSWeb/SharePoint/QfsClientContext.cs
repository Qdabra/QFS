using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.SharePoint.Client;

namespace QFSWeb.SharePoint
{
    public class QfsClientContext : ClientContext
    {
        public string AccessToken { get; set; }

        public QfsClientContext(string webFullUrl, string accessToken)
            : base(webFullUrl)
        {
            AccessToken = accessToken;

            ExecutingWebRequest += (oSender, webRequestEventArgs) =>
            {
                webRequestEventArgs.WebRequestExecutor.RequestHeaders["Authorization"] =
                    "Bearer " + accessToken;
            };
        }
    }
}