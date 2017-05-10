using Microsoft.IdentityModel.Tokens;
using System;
using System.Net;
using System.Web;

namespace QFSWeb.Utilities
{
    public class SharePointAcsSerializableContextProvider : SharePointContextProvider
    {
        private const string SPContextKey = "SPContext";
        private const string SPCacheKeyKey = "SPCacheKey";

        protected override SharePointContext CreateSharePointContext(Uri spHostUrl, Uri spAppWebUrl, string spLanguage, string spClientTag, string spProductNumber, HttpRequestBase httpRequest)
        {
            string contextTokenString = TokenHelper.GetContextTokenFromRequest(httpRequest);
            if (string.IsNullOrEmpty(contextTokenString))
            {
                return null;
            }

            SharePointContextToken contextToken = null;
            try
            {
                contextToken = TokenHelper.ReadAndValidateContextToken(contextTokenString, httpRequest.Url.Authority);
            }
            catch (WebException)
            {
                return null;
            }
            catch (AudienceUriValidationFailedException)
            {
                return null;
            }

            return new SharePointAcsSerializableContext(spHostUrl, spAppWebUrl, spLanguage, spClientTag, spProductNumber, contextTokenString, contextToken);
        }

        protected override bool ValidateSharePointContext(SharePointContext spContext, HttpContextBase httpContext)
        {
            SharePointAcsSerializableContext spAcsContext = spContext as SharePointAcsSerializableContext;

            if (spAcsContext != null)
            {
                Uri spHostUrl = SharePointContext.GetSPHostUrl(httpContext.Request);
                var contextTokenFromRequest = TokenHelper.GetContextTokenFromRequest(httpContext.Request);
                HttpCookie spCacheKeyCookie = httpContext.Request.Cookies[SPCacheKeyKey];
                string spCacheKey = spCacheKeyCookie != null ? spCacheKeyCookie.Value : null;

                var urlsMatch = (spHostUrl == spAcsContext.SPHostUrl);
                var cacheKeysMatch = !string.IsNullOrEmpty(spAcsContext.CacheKey) &&
                                     spCacheKey == spAcsContext.CacheKey;
                var contextTokensMatch = string.IsNullOrEmpty(spAcsContext.ContextToken) ||
                                         string.IsNullOrEmpty(contextTokenFromRequest) ||
                                         contextTokenFromRequest == spAcsContext.ContextToken;

                return urlsMatch && cacheKeysMatch && contextTokensMatch;
            }

            return false;
        }

        protected override SharePointContext LoadSharePointContext(HttpContextBase httpContext)
        {
            return httpContext.Session[SPContextKey] as SharePointAcsSerializableContext;
        }

        protected override void SaveSharePointContext(SharePointContext spContext, HttpContextBase httpContext)
        {
            SharePointAcsSerializableContext spAcsContext = spContext as SharePointAcsSerializableContext;

            if (spAcsContext != null)
            {
                HttpCookie spCacheKeyCookie = new HttpCookie(SPCacheKeyKey)
                {
                    Value = spAcsContext.CacheKey,
                    Secure = true,
                    HttpOnly = true
                };

                httpContext.Response.AppendCookie(spCacheKeyCookie);
            }

            httpContext.Session[SPContextKey] = spAcsContext;
        }
    }
}