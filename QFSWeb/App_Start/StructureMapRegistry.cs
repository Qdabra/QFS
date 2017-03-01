using QFSWeb.Interface;
using QFSWeb.Utilities;
using StructureMap.Configuration.DSL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Configuration;

namespace QFSWeb.App_Start
{
    public class StructureMapRegistry : Registry
    {
        #region === [ Constructor ] ==========================================================================

        public bool IsSql
        {
            get
            {
                var setting = WebConfigurationManager.AppSettings.Get(ApplicationConstants.SQLStorage.StorageProviderKey);

                if (!string.IsNullOrWhiteSpace(setting) && setting.Equals(ApplicationConstants.SQLStorage.StorageProvider))
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }
        }

        /// <summary>
        /// Default Constructor
        /// </summary>
        public StructureMapRegistry()
        {
            if (IsSql)
            {
                For<IStorageHelper>().Use<SQLStorageHelper>();
            }
            else
            {
                For<IStorageHelper>().Use<StorageHelper>();
            }

            For<HttpContextBase>().HybridHttpOrThreadLocalScoped().Use(() => new HttpContextWrapper(HttpContext.Current));

            //For<IUserManager>().Use<UserManager>();
            //For<IWidgetManager>().Use<WidgetManager>();
            //For<IMarketingManager>().Use<MarketingManager>();
        }
        #endregion

    }
}