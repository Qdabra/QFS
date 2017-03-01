using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.XPath;
using System.Linq;
using System.Xml.Linq;
using Microsoft.SharePoint.Client;
using Wictor.Office365;
using System.IO;
using System.Web;
//using FormsQuo.S2S.OAuth;

namespace InfoPathServices
{
    public class ShpUtilities
    {
        #region Private Constants

        private const string SINGLE_ITEM_LIST_ERROR = "Error adding item to the list. \nDetails: ";
        private const string MULTI_ITEM_LIST_ERROR = "Error adding items to the list. \nDetails: ";
        private const string GET_FIELDS_ERROR = "Error occurred in function GetFieldValuesAndUploadData. \n Details: ";
        private const string UPLOAD_DATA_ERROR = "Error occurred in function UploadData. \n Details: ";
        private const string MESSAGE_BOX_TITLE = "Qdabra InfoPath To SharePoint List Tool";

        #endregion Private Constants


#if false
        public ListItemIdList GetFieldValuesAndUploadData(XmlDocument doc, string siteUrl, XmlDocument mapping)
        {
            return PerformMappingAndSubmit(doc, siteUrl, mapping);
        }
        private ListItemIdList PerformMappingAndSubmit(XmlDocument doc, string siteUrl, XmlNode mapping)
        {
            ListItemIdList itemIdList = new ListItemIdList();

            Dictionary<int, XmlNode> methodMap;
            XmlNamespaceManager nsm = GenerateBatch.BuildNamespaceManager(doc);
            ListName listName = GetListName(mapping);


            XmlElement batch = GenerateBatch.GenerateBatchElement(doc, nsm, mapping, out methodMap);
            if (null == batch)
            {
                return itemIdList;
            }

            itemIdList = UploadData(siteUrl, listName.ListNameToUse, batch);

            return itemIdList;
        }
#endif
        private void CheckErrors(XPathNavigator nav, string listName)
        {
            List<string> errors = new List<string>();

            XPathNodeIterator errorCodes = nav.Select(".//so:Result/so:ErrorCode[. != '0x00000000']", SharePointNamespaceManager);

            foreach (XPathNavigator errorCode in errorCodes)
            {
                XPathNavigator text = errorCode.SelectSingleNode("../so:ErrorText", SharePointNamespaceManager);
                errors.Add(text == null ? "Unspecified error: " + errorCode.Value : text.Value);
            }

            if (errors.Count != 0)
            {
                throw new ApplicationException("Error mapping to list " + listName + ": " + string.Join(System.Environment.NewLine, errors.ToArray()));
            }
        }

        private ListName GetListName(XmlNode mapping)
        {
            XmlNode listCollection = mapping.SelectSingleNode(".//*[local-name() = 'ListCollection']");
            XmlNode useName = listCollection.SelectSingleNode("@*[local-name() = 'useName']");
            XmlNode listName = listCollection.SelectSingleNode("@*[local-name() = 'ListName']");

            ListName ln = new ListName();
            ln.ID = listCollection.InnerText;
            ln.UseName = useName != null && useName.Value == "true";
            ln.Name = listName.Value;

            return ln;
        }


        private static XmlNamespaceManager _sharePointNamespaceManager;
        private static XmlNamespaceManager SharePointNamespaceManager
        {
            get
            {
                if (_sharePointNamespaceManager == null)
                {
                    XmlNamespaceManager ns = new XmlNamespaceManager(new NameTable());
                    ns.AddNamespace("so", "http://schemas.microsoft.com/sharepoint/soap/");
                    ns.AddNamespace("z", "#RowsetSchema");

                    _sharePointNamespaceManager = ns;
                }

                return _sharePointNamespaceManager;
            }
        }

        private void AssignIds(XmlNode mapping, XPathNavigator outputNav, Dictionary<int, XmlNode> methodMap, XmlNamespaceManager nsm)
        {
            try
            {
                string idPath = GenerateBatch.GetListIdPath(mapping);

                if (idPath != null)
                {
                    XPathNodeIterator newIdResults =
                        outputNav.Select(@"//so:Result[substring-after(@ID, ',') = 'New']
                                               [number(substring-before(@ID, ',')) = number(substring-before(@ID, ','))]
                                               [z:row/@ows_ID]",
                                         SharePointNamespaceManager);

                    XmlNode foundNode;
                    foreach (XPathNavigator result in newIdResults)
                    {
                        string methodId = result.SelectSingleNode("@ID").Value;
                        methodId = methodId.Remove(methodId.IndexOf(','));

                        // Ensured to be safe by the selection XPath
                        int methodIdInt = int.Parse(methodId);

                        if (methodMap.TryGetValue(methodIdInt, out foundNode))
                        {
                            XmlNode idNode = foundNode.SelectSingleNode(idPath, nsm);
                            if (idNode != null && string.IsNullOrEmpty(idNode.InnerText))
                            {
                                idNode.InnerText = result.SelectSingleNode("z:row/@ows_ID", SharePointNamespaceManager).Value;
                            }
                        }
                    }
                }
            }
            catch (Exception e)
            {
                throw e;
            }
        }


        private ListItemIdList UploadData(ClientContext context, string siteUrl, string listName, XmlElement batch)
        {
            XmlNodeList batchNodes = batch.SelectNodes("Method");
            int id = int.MinValue;

            ListItemIdList itemIdList = new ListItemIdList();
            List spList = context.Web.Lists.GetByTitle(listName);
            foreach (XmlNode newNode in batchNodes)
            {
                string command = newNode.SelectSingleNode("@Cmd").InnerText;
                ListItem item = null;

                if (command == "New")
                {
                    ListItemCreationInformation itemCreateInfo = new ListItemCreationInformation();
                    item = spList.AddItem(itemCreateInfo);
                }
                else if (command == "Update")
                {
                    XmlNode idNode = newNode.SelectSingleNode("Field[@Name='ID']");
                    id = Convert.ToInt32(idNode.InnerText);
                    item = spList.GetItemById(id);
                }

                UpdateListItemFields(item, newNode);
                item.Update();
                AddAttachments(item, newNode);
                item.Update();
                context.ExecuteQuery();
                itemIdList.Add(new ListItemId(id > int.MinValue ? id : item.Id));
            }
            return itemIdList;
        }
#if false
        private ListItemIdList UploadData(string siteUrl, string listName, XmlElement batch)
        {
            try
            {
                HttpContext httpContext = HttpContext.Current;
                if (!TokenCache.IsTokenInCache(httpContext.Request.Cookies))
                {
                    throw new ArgumentException("Token required");
                }

                //get the access token from ACS
                string refreshToken = TokenCache.GetCachedRefreshToken(httpContext.Request.Cookies);
                string accessToken = TokenHelper.GetAccessTokenFromResponse(
                                        refreshToken,
                                        OAuthPrincipal.SharePoint,
                                        Utilities.sharePointUri.Authority,
                                        TokenHelper.GetRealmFromTargetUrl(Utilities.sharePointUri)
                                        );

                // use the access token to get a CSOM client context & get values from SharePoint
                using (ClientContext clientContext = TokenHelper.GetClientContextWithAccessToken(siteUrl, accessToken))
                {
                    return UploadData(clientContext, siteUrl, listName, batch);
                }
            }
            catch (Exception ex)
            {
                throw new Exception(UPLOAD_DATA_ERROR + ex.Message);
            }
        }
#endif
        private void AddAttachments(ListItem item, XmlNode newNode)
        {
            AttachmentCreationInformation attInfo = new AttachmentCreationInformation();
            //attachment data is in Attachments/Attachment
            XmlNodeList attachments = newNode.SelectNodes("Attachments/Attachment");
            foreach (XmlNode attachment in attachments)
            {
                //get file attributes and file bytes
                if (string.IsNullOrEmpty(attachment.InnerText))
                    return;

                string attachmentName, attachmentExtension;
                int attSize;
                byte[] fileData;
                Base64Helper.GetBase64Values(attachment.InnerText, out attachmentName, out attachmentExtension, out attSize, out fileData);

                attInfo.FileName = string.Format("{0}_{1}", DateTime.Now.ToString("yyyyMMddHHmmssfffff"), attachmentName);
                attInfo.ContentStream = new MemoryStream(fileData);
                item.AttachmentFiles.Add(attInfo);

            }

        }

        private void UpdateListItemFields(ListItem listItem, XmlNode methodNode)
        {
            string fieldXpath = "Field[@Name!='ID']";

            foreach (XmlNode fieldNode in methodNode.SelectNodes(fieldXpath))
            {
                List list = listItem.ParentList;
                string fieldName = fieldNode.Attributes["Name"].Value;
                listItem[fieldName] = string.IsNullOrEmpty(fieldNode.InnerText) ? null : fieldNode.InnerText;

            }
        }

        public LibraryItem SaveToSharePoint(ClientContext context, string data, string libraryUrl, string libraryName)
        {
            string siteUrl = GetSiteUrlFromLibraryUrl(libraryUrl);
            string serverRelativeUrl = GetServerRelativeUrlFromLibraryUrl(libraryUrl);
            string serverUrl = GetServerUrlFromLibraryUrl(libraryUrl);
            string librarySegment = GetLibraryUrlSegment(libraryUrl);

            LibraryItem libraryItem = new LibraryItem();
            string fileName, fileExtension;
            int fileSize;
            byte[] fileData;
            Base64Helper.GetBase64Values(data, out fileName, out fileExtension, out fileSize, out fileData);

            List library = context.Web.Lists.GetByTitle(libraryName);
            string uniqueFileName = string.Format("{0}{1}", DateTime.Now.ToString("yyyyMMddHHmmssfffff"), fileName);
            string fileUrl = string.Format("{0}/{1}", librarySegment, uniqueFileName);

            FileCreationInformation fileInfo = new FileCreationInformation();
            fileInfo.ContentStream = new MemoryStream(fileData);
            fileInfo.Url = uniqueFileName;

            Microsoft.SharePoint.Client.File newFile = library.RootFolder.Files.Add(fileInfo);
            context.Load(library);
            context.ExecuteQuery();
            ListItem fileListItem = newFile.ListItemAllFields;
            context.Load(fileListItem);
            context.ExecuteQuery();
            libraryItem.Id = fileListItem.Id;
            libraryItem.Link = new Uri(string.Format("{0}{1}", siteUrl, fileUrl));
            return libraryItem;
        }
#if false
        public LibraryItem SaveToSharePoint(string data, string libraryUrl, string libraryName)
        {
            string siteUrl = GetSiteUrlFromLibraryUrl(libraryUrl);
            HttpContext httpContext = HttpContext.Current;

            if (!TokenCache.IsTokenInCache(httpContext.Request.Cookies))
            {
                throw new ArgumentException("Token required");
            }

            //get the access token from ACS
            string refreshToken = TokenCache.GetCachedRefreshToken(httpContext.Request.Cookies);
            string accessToken = TokenHelper.GetAccessTokenFromResponse(
                                    refreshToken,
                                    OAuthPrincipal.SharePoint,
                                    Utilities.sharePointUri.Authority,
                                    TokenHelper.GetRealmFromTargetUrl(Utilities.sharePointUri)
                                    );

            // use the access token to get a CSOM client context & get values from SharePoint
            using (ClientContext clientContext = TokenHelper.GetClientContextWithAccessToken(siteUrl, accessToken))
            {
                return SaveToSharePoint(clientContext, data, libraryUrl, libraryName);
            }
        }
#endif
        private string GetLibraryUrlSegment(string libraryUrl)
        {
            string[] segments = new Uri(libraryUrl).Segments;
            return segments[segments.Length - 1];
        }

        private string GetServerUrlFromLibraryUrl(string libraryUrl)
        {
            Uri library = new Uri(libraryUrl);
            return library.GetLeftPart(UriPartial.Authority);
        }

        private string GetServerRelativeUrlFromLibraryUrl(string libraryUrl)
        {
            //server relative url is url w/out the server.
            return libraryUrl.Replace(GetServerUrlFromLibraryUrl(libraryUrl), "");

        }

        private string GetSiteUrlFromLibraryUrl(string libraryUrl)
        {
            Uri url = new Uri(libraryUrl);

            string[] segments = url.Segments;
            StringBuilder sb = new StringBuilder();

            sb.Append(url.GetLeftPart(UriPartial.Authority));

            for (int count = 0; count < segments.Length - 1; count++)
            {
                sb.Append(segments[count]);
            }

            return sb.ToString();
        }
    }

    internal struct ListName
    {
        internal string Name;
        internal string ID;
        internal bool UseName;

        internal string ListNameToUse { get { return UseName ? Name : ID; } }
    }
}

