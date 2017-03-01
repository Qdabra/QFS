using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Collections.Specialized;
using System.Web.Routing;

namespace QFSWeb
{
    public static class Extensions
    {
        public static RouteValueDictionary ToRouteValues(this NameValueCollection queryString)
        {
            if (queryString == null || !queryString.HasKeys()) return new RouteValueDictionary();

            var routeValues = new RouteValueDictionary();
            foreach (string key in queryString.AllKeys)
            {
                if (!routeValues.ContainsKey(key))
                {
                    routeValues.Add(key, queryString[key]);
                }
            }

            return routeValues;
        }

        public static string ToPascalCase(this string strValue)
        {
            if (String.IsNullOrWhiteSpace(strValue))
            {
                return null;
            }

            return strValue[0].ToString().ToUpper() + strValue.Substring(1).ToLower();
        }
    }
}