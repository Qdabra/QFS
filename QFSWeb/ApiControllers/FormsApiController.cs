using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Microsoft.SharePoint.Client;

namespace QFSWeb.ApiControllers
{
    [RoutePrefix("api/Forms")]
    public class FormsApiController : ApiController
    {
        private int? StateValue
        {
            get { 
                int? iValue = (int?)System.Web.HttpContext.Current.Session["StateValue"]; 
                if (iValue.HasValue)
                {
                    return iValue.Value;
                }
                return 0;
            }
            set { 
                System.Web.HttpContext.Current.Session["StateValue"] = value; 
            }
        }

        [Route("SharePointGetState"), HttpGet]
        [SharePointContextFilter]
        public HttpResponseMessage SharePointGetState()
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
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                string msg = string.Format("Count: {0},   User: {1}", StateValue, username);
                resp.Content = new StringContent(msg, System.Text.Encoding.UTF8, "text/plain");
                return resp;
            }
        }

        [Route("GetState"), HttpGet]
        public HttpResponseMessage GetState()
        {
            StateValue += 1;  // StateValue is a property that gets/sets a value in the Session

            var resp = new HttpResponseMessage(HttpStatusCode.OK);
            resp.Content = new StringContent(StateValue.ToString(), System.Text.Encoding.UTF8, "text/plain");
            return resp;
        }

        [SharePointContextFilter]
        public InfoPathServices.FormInformation FormInformation(string libraryUrl, string xsnUrl)
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                InfoPathServices.FormInformation info = null;
                if (clientContext != null)
                {
                    info = InfoPathServices.InfoPathAnalytics.FormInformation(clientContext, libraryUrl, xsnUrl);
                }
                // Sort info
                SortFormInformation(info);

                return info;
            }
        }
        private void SortFormInformation(InfoPathServices.FormInformation info)
        {
            info.DataConnections.Sort(
                    delegate(InfoPathServices.DataConnection x, InfoPathServices.DataConnection y)
                        {
                            if (x.Name == null && y.Name == null) return 0;
                            else if (x.Name == null) return -1;
                            else if (y.Name == null) return 1;
                            else return x.Name.CompareTo(y.Name);
                        });
        }
    }
}