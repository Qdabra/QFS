using Microsoft.SharePoint.Client;
using System;

namespace QFSWeb.Utilities
{
    public static class SPHelper
    {
        public static bool CreateSharePointFolder(ClientContext context, string libraryName, string folderName, out string errMsg)
        {
            errMsg = null;
            try
            {
                var list = context.Web.Lists.GetByTitle(libraryName);
                list.CreateFolder(folderName);
                context.ExecuteQuery();
                return true;
            }
            catch (Exception ex)
            {
                errMsg = ex.Message;
                return false;
            }
        }

        public static void CreateFolder(this List list, string name)
        {
            var info = new ListItemCreationInformation
            {
                UnderlyingObjectType = FileSystemObjectType.Folder,
                LeafName = name
            };

            var newItem = list.AddItem(info);
            newItem.Update();
        }
    }
}