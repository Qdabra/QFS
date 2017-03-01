using System;
using System.Web;
using Microsoft.SharePoint.Client;
using System.Web.Configuration;

namespace QFSWeb
{
    public class SpManager
    {
        public static string GetHostParam(HttpRequestBase request)
        {
            return request.QueryString["SPHostUrl"];
        }

        public static string GetSpHost()
        {
            var spHost = GetHostParam(new HttpRequestWrapper(HttpContext.Current.Request));

            return spHost;
        }

        public static string GetHostDomain()
        {
            // todo: ensure that the user has access to the host passed in
            var spHost = GetSpHost();

            if (spHost == null)
            {
                return null;
            }

            return spHost.ToLower().Substring("https://".Length).Split('.')[0];
        }

        internal static Uri GetUrlForAppOnly(HttpContextBase httpContext, string webUrl)
        {
            var hostUrl = new Uri(GetHostParam(httpContext.Request));

            if (webUrl == null)
            {
                return hostUrl;
            }

            var uri = new Uri(webUrl);

            if (uri.Host != hostUrl.Host)
            {
                throw new ApplicationException("Cross-domain querying is not allowed in AppOnly mode.");
            }

            return uri;
        }

        internal static ClientContext GetSharePointContext(HttpContextBase httpContext, string webUrl = null)
        {
            var request = httpContext.Request;

            var appOnly = (httpContext.Request.QueryString["AppOnly"] == "true");

            if (appOnly)
            {
                var sharepointUrl = GetUrlForAppOnly(httpContext, webUrl);

                var realm = TokenHelper.GetRealmFromTargetUrl(sharepointUrl);

                var setting = WebConfigurationManager.AppSettings.Get(ApplicationConstants.SQLStorage.StorageProviderKey);

                if (!string.IsNullOrWhiteSpace(setting) && setting.Equals(ApplicationConstants.SQLStorage.StorageProvider))
                {
                    var appOnlyAccessToken = TokenHelper.GetS2SAccessTokenWithWindowsIdentity(sharepointUrl, null);

                    return TokenHelper.GetClientContextWithAccessToken(sharepointUrl.AbsoluteUri, appOnlyAccessToken);
                }
                else
                {
                    var appOnlyAccessToken = TokenHelper.GetAppOnlyAccessToken(TokenHelper.SharePointPrincipal, sharepointUrl.Authority, realm);

                    return TokenHelper.GetClientContextWithAccessToken(sharepointUrl.ToString(), appOnlyAccessToken.AccessToken);
                }

                //var appOnlyAccessToken = TokenHelper.GetAppOnlyAccessToken(TokenHelper.SharePointPrincipal, sharepointUrl.Authority, realm);

                //return TokenHelper.GetClientContextWithAccessToken(sharepointUrl.ToString(), appOnlyAccessToken.AccessToken);
            }

            var spContext = SharePointContextProvider.Current.GetSharePointContext(httpContext);

            ClientContext context = spContext.CreateUserClientContextForSPHost();

            if (context == null)
            {
                throw new InvalidOperationException("No SharePoint context available");
            }

            return context;
        }

        public static string GetRealm()
        {
            var host = new Uri(GetSpHost());
            var realm = TokenHelper.GetRealmFromTargetUrl(host);

            return realm;
        }

        public static bool IsUserSiteAdmin(ClientContext ctx, int userId)
        {
            var userInfoList = ctx.Site.RootWeb.SiteUserInfoList;
            var item = userInfoList.GetItemById(userId);
            ctx.Load(item);
            ctx.ExecuteQuery();

            return (bool)item["IsSiteAdmin"];
        }

        internal static bool IsUserAdmin(ClientContext ctx)
        {
            var currentUser = ctx.Web.CurrentUser;

            ctx.Load(currentUser);
            ctx.ExecuteQuery();

            return IsUserSiteAdmin(ctx, currentUser.Id);
        }
    }
}