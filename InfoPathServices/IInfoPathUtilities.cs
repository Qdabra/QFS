using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;
using System.ServiceModel.Web;
using System.ComponentModel;

namespace InfoPathServices
{
    [ServiceContract]
    public interface IInfoPathUtilities
    {
        [OperationContract]
        [WebInvoke(BodyStyle=WebMessageBodyStyle.Wrapped)]
        [Description("Submits items from XML to a SharePoint List. Optional xsnUrl is overridden by submitted data's href attribute if href is a valid URL.")]
        ListItemIdList SubmitToSharePointList(string data, string xsnUrl);
   
        [OperationContract]
        [WebInvoke(BodyStyle = WebMessageBodyStyle.Wrapped)]
        [Description("Adds an item to SharePoint Library and returns a link to the item.")]
        LibraryItem SaveToSharePoint(string data, string libraryUrl, string libraryName);

        [OperationContract]
        [WebGet(BodyStyle = WebMessageBodyStyle.Wrapped)]
        [Description("Generates a new GUID.")]
        Guid GenerateGuid();
    }

    [ServiceContract]
    public interface IInfoPathAuthTest
    {
        [OperationContract]
        [WebInvoke(BodyStyle = WebMessageBodyStyle.Wrapped)]
        [Description("Submits items from XML to a SharePoint List. Optional xsnUrl is overridden by submitted data's href attribute if href is a valid URL.")]
        string ClaimsCheck();

        [OperationContract]
        [WebGet(BodyStyle = WebMessageBodyStyle.Wrapped)]
        [Description("Generates a new GUID.")]
        Guid GenerateGuid();
    }
}
