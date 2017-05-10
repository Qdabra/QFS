using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;
using System.Web.Http;
using System.Text;
using System.Xml;
using Newtonsoft.Json;
using System.Web.Configuration;
using StructureMap;
using QFSWeb.App_Start;
using System.Collections;
using System.IO;
using System.Globalization;
using System.Web.Script.Serialization;

namespace QFSWeb
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            // This will return xml for any url with ?format=xml that and accepts "application/xml" content 
            GlobalConfiguration.Configuration.Formatters.XmlFormatter.MediaTypeMappings.Add(new System.Net.Http.Formatting.QueryStringMapping("format", "xml", "application/xml"));

            GlobalConfiguration.Configure(WebApiConfig.Register);

            AreaRegistration.RegisterAllAreas();

            ObjectFactory.Initialize(x => { x.AddRegistry<StructureMapRegistry>(); });
            ControllerBuilder.Current.SetControllerFactory(new StructureMapControllerFactory());

            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);

            //06-04-2017: Implement custom RedisSessionStateProvider
            SharePointConfig.RegisterProvider();

            // Source: http://haacked.com/archive/2010/04/15/
            // sending-json-to-an-asp-net-mvc-action-method-argument.aspx
            // This must be added to accept JSON as request
            //ValueProviderFactories.Factories.Add(new JsonValueProviderFactory());
            // This must be added to accept XML as request
            // Source: http://www.nogginbox.co.uk/blog/xml-to-asp.net-mvc-action-method
            ValueProviderFactories.Factories.Add(new XmlValueProviderFactory());

            // case 43410 - code from https://forums.asp.net/t/1751116.aspx?How+to+increase+maxJsonLength+for+JSON+POST+in+MVC3
            //find the default JsonVAlueProviderFactory
            JsonValueProviderFactory jsonValueProviderFactory = null;

            foreach (var factory in ValueProviderFactories.Factories)
            {
                if (factory is JsonValueProviderFactory)
                {
                    jsonValueProviderFactory = factory as JsonValueProviderFactory;
                }
            }

            //remove the default JsonVAlueProviderFactory
            if (jsonValueProviderFactory != null)
            {
                ValueProviderFactories.Factories.Remove(jsonValueProviderFactory);
            }

            //add custom JSON provider
            ValueProviderFactories.Factories.Add(new FvJsonValueProviderFactory());
        }

        protected void Session_Start(object sender, EventArgs e)
        {
            string id = Session.SessionID;
        }
        protected void Application_PostAuthorizeRequest()
        {
            System.Web.HttpContext.Current.SetSessionStateBehavior(System.Web.SessionState.SessionStateBehavior.Required);
        }

        protected void Application_Error()
        {
            //Source: http://forums.asp.net/t/1505777.aspx?Error+Handling+in+global+asax
            //modified to return JSON if IsAjaxRequest is true
            HttpContext ctx = HttpContext.Current;
            KeyValuePair<string, object> lastError = new KeyValuePair<string, object>("ErrorMessage", ctx.Server.GetLastError().Message.ToString());
            ctx.Response.Clear();

            if (new HttpRequestWrapper(System.Web.HttpContext.Current.Request).IsAjaxRequest())
            {
                Response.Write(JsonConvert.SerializeObject(new
                {
                    error = true,
                    message = "Exception: " + lastError.Value.ToString()
                })
                        );
            }
            else
            {
                RequestContext rc = ((MvcHandler)ctx.CurrentHandler).RequestContext;
                string controllerName = rc.RouteData.GetRequiredString("controller");
                IControllerFactory factory = ControllerBuilder.Current.GetControllerFactory();
                IController controller = factory.CreateController(rc, controllerName);
                ControllerContext cc = new ControllerContext(rc, (ControllerBase)controller);

                ViewResult viewResult = new ViewResult { ViewName = "Error" };
                viewResult.ViewData.Add(lastError);
                viewResult.ExecuteResult(cc);
            }

            ctx.Server.ClearError();


        }
    }
    #region Serialization Helpers
    public class EnableXmlAttribute : ActionFilterAttribute
    {
        private readonly static string[] _xmlTypes = new string[] { "application/xml", "text/xml" };

        public override void OnActionExecuted(ActionExecutedContext filterContext)
        {
            if (typeof(RedirectToRouteResult).IsInstanceOfType(filterContext.Result))
                return;

            var acceptTypes = filterContext.HttpContext.Request.AcceptTypes ?? new[] { "text/html" };

            var model = filterContext.Controller.ViewData.Model;

            var contentEncoding = filterContext.HttpContext.Request.ContentEncoding ?? Encoding.UTF8;

            if (_xmlTypes.Any(type => acceptTypes.Contains(type)))
                filterContext.Result = new XmlResult()
                {
                    Data = model,
                    ContentEncoding = contentEncoding,
                    ContentType = filterContext.HttpContext.Request.ContentType
                };
        }
    }

    public class EnableJsonAttribute : ActionFilterAttribute
    {
        private readonly static string[] _jsonTypes = new string[] { "application/json", "text/json" };

        public override void OnActionExecuted(ActionExecutedContext filterContext)
        {
            if (typeof(RedirectToRouteResult).IsInstanceOfType(filterContext.Result))
                return;

            var acceptTypes = filterContext.HttpContext.Request.AcceptTypes ?? new[] { "text/html" };

            var model = filterContext.Controller.ViewData.Model;

            var contentEncoding = filterContext.HttpContext.Request.ContentEncoding ??
                      Encoding.UTF8;

            if (_jsonTypes.Any(type => acceptTypes.Contains(type)))
                filterContext.Result = new JsonResult()
                {
                    Data = model,
                    ContentEncoding = contentEncoding,
                    ContentType = filterContext.HttpContext.Request.ContentType
                };
        }
    }
    #endregion


    public sealed class FvJsonValueProviderFactory : ValueProviderFactory
    {
        private static void AddToBackingStore(Dictionary<string, object> backingStore, string prefix, object value)
        {
            var d = value as IDictionary<string, object>;
            if (d != null)
            {
                foreach (KeyValuePair<string, object> entry in d)
                {
                    AddToBackingStore(backingStore, MakePropertyKey(prefix, entry.Key), entry.Value);
                }
                return;
            }

            IList l = value as IList;
            if (l != null)
            {
                for (int i = 0; i < l.Count; i++)
                {
                    AddToBackingStore(backingStore, MakeArrayKey(prefix, i), l[i]);
                }
                return;
            }

            // primitive
            backingStore[prefix] = value;
        }

        private static object GetDeserializedObject(ControllerContext controllerContext)
        {
            if (!controllerContext.HttpContext.Request.ContentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase))
            {
                // not JSON request
                return null;
            }

            StreamReader reader = new StreamReader(controllerContext.HttpContext.Request.InputStream);
            string bodyText = reader.ReadToEnd();
            if (String.IsNullOrEmpty(bodyText))
            {
                // no JSON data
                return null;
            }

            JavaScriptSerializer serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = int.MaxValue; //increase MaxJsonLength.  This could be read in from the web.config if you prefer
            object jsonData = serializer.DeserializeObject(bodyText);
            return jsonData;
        }

        public override IValueProvider GetValueProvider(ControllerContext controllerContext)
        {
            if (controllerContext == null)
            {
                throw new ArgumentNullException("controllerContext");
            }

            object jsonData = GetDeserializedObject(controllerContext);
            if (jsonData == null)
            {
                return null;
            }

            Dictionary<string, object> backingStore = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            AddToBackingStore(backingStore, String.Empty, jsonData);
            return new DictionaryValueProvider<object>(backingStore, CultureInfo.CurrentCulture);
        }

        private static string MakeArrayKey(string prefix, int index)
        {
            return prefix + "[" + index.ToString(CultureInfo.InvariantCulture) + "]";
        }

        private static string MakePropertyKey(string prefix, string propertyName)
        {
            return (String.IsNullOrEmpty(prefix)) ? propertyName : prefix + "." + propertyName;
        }
    }
}
