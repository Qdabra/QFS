using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;
using System.Xml;
using Qdabra;
using System.IO;
using System.ServiceModel.Activation;
using System.Security.Claims;

namespace InfoPathServices
{
#if false
    public sealed class AnonymousWSDLAccess : System.Web.Mvc.AuthorizeAttribute
    {
        public override void OnAuthorization(AuthorizationContext filterContext)
        {
            if (filterContext.RequestContext != null && filterContext.RequestContext.HttpContext != null)
            {
                string wsdl = filterContext.RequestContext.HttpContext.Request.QueryString["wsdl"];
                if (wsdl != null)
                {
                    return;
                }
            }
            base.OnAuthorization(filterContext);
        }
    }
#endif

    [AspNetCompatibilityRequirements(RequirementsMode = AspNetCompatibilityRequirementsMode.Required)]
//    [System.Web.Services.WebServiceBinding(ConformsTo = System.Web.Services.WsiProfiles.BasicProfile1_1, EmitConformanceClaims = true)]
    public class InfoPathAuthTest : IInfoPathAuthTest
    {
        public InfoPathAuthTest()
        {
            OperationContext ctx = OperationContext.Current;
            ClaimsPrincipal claimsPrincipal;
            if (ctx != null)
            {
                claimsPrincipal = ctx.ClaimsPrincipal;
            }
            System.Diagnostics.Debug.WriteLine("InfoPathAuthTest:.ctor()");
        }

//        [System.Security.Permissions.PrincipalPermission(System.Security.Permissions.SecurityAction.Demand, Authenticated = true)]
        public string ClaimsCheck()
        {
            // Get the caller's identity from ClaimsPrincipal.Current
            ClaimsPrincipal claimsPrincipal = OperationContext.Current.ClaimsPrincipal;

            // Start generating the output
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("Claims Info");

            ClaimsPrincipal threadPrincipal = System.Threading.Thread.CurrentPrincipal as ClaimsPrincipal;

            if (claimsPrincipal != null)
            {
                // Display the claims from the caller. Do not use this code in a production application.
                ClaimsIdentity identity = claimsPrincipal.Identity as ClaimsIdentity;
                builder.AppendLine("Client Name:" + identity.Name);
                builder.AppendLine("IsAuthenticated:" + identity.IsAuthenticated);
                builder.AppendLine("The service received the following issued claims of the client:");

                // Iterate over the caller’s claims and append to the output
                foreach (Claim claim in claimsPrincipal.Claims)
                {
                    builder.AppendLine("ClaimType :" + claim.Type + "   ClaimValue:" + claim.Value);
                }
            }

            return builder.ToString();
        }

        public Guid GenerateGuid()
        {
            ClaimsPrincipal p1 = OperationContext.Current.ClaimsPrincipal;
            ClaimsPrincipal p2 = ClaimsPrincipal.Current;

            string p1name = (p1 == null || p1.Identity == null) ? "{null}" : p1.Identity.Name;
            string p2name = (p2 == null || p2.Identity == null) ? "{null}" : p2.Identity.Name;

            System.Diagnostics.Debug.WriteLine("OperationContext.Current.ClaimsPrincipal: " + p1name + ", ClaimsPrincipal.Current = " + p2name);
            return Guid.NewGuid();
        }
    }
#if false
    [AspNetCompatibilityRequirements(RequirementsMode = AspNetCompatibilityRequirementsMode.Allowed)]
    [System.Web.Services.WebServiceBinding(ConformsTo = System.Web.Services.WsiProfiles.BasicProfile1_1, EmitConformanceClaims = true)]
    public class InfoPathUtilities : IInfoPathUtilities
    {
        public ListItemIdList SubmitToSharePointList(string data, string xsnUrl)
        {
            ClaimsPrincipal principal = ClaimsPrincipal.Current;
            if (Utilities.InitializeWebServiceCall(principal, "xml", xsnUrl))
            {
                XmlDocument doc = new XmlDocument();
                doc.LoadXml(data);

                Uri href = Utilities.GetHrefFromXml(doc);

                if (href != null)
                    xsnUrl = href.ToString();

                XmlDocument mappingDoc = new XmlDocument();
                mappingDoc.LoadXml(new InfoPathAnalytics().FormFileContents(null, xsnUrl, "mapping.xml", "xml").Contents);

                string siteUrl = mappingDoc.SelectSingleNode("//SharePointListURL").InnerText;

                ShpUtilities shpUtilities = new ShpUtilities();
                return shpUtilities.GetFieldValuesAndUploadData(doc, siteUrl, mappingDoc);
            }
            else
                return null;
        }
#if false
        public LibraryItem SaveToSharePoint(string data, string libraryUrl, string libraryName)
        {
            ClaimsPrincipal principal = ClaimsPrincipal.Current;
            if (Utilities.InitializeWebServiceCall(principal, "xml", libraryUrl))
            {

                ShpUtilities shpUtilities = new ShpUtilities();

                return shpUtilities.SaveToSharePoint(data, libraryUrl, libraryName);
            }
            else
                return null;
        }
#endif
        public Guid GenerateGuid()
        {
            return Guid.NewGuid();
        }
    }
#endif
}
