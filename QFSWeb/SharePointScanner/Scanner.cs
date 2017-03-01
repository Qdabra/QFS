using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.UI;
using Microsoft.SharePoint.Client;
using Microsoft.SharePoint.Client.Utilities;
using Microsoft.SharePoint.Client.Workflow;

namespace QFSWeb.SharePointScanner
{
    public class SiteScanner
    {
        public bool m_verbose = true;
        public bool m_firstWebProcessed = true;
        public bool m_newList = true;
        public bool m_listHasOutput = false;
        public string m_outputFile;
        public bool m_headerWritten = false;

        public HtmlTextWriter Writer { get; set; }
        public List<string> XsnList { get; set; }

        public SiteScanner()
        {
            XsnList = new List<string>();
        }

        void WriteLine(string msg)
        {
            Writer.Write(msg);
            Writer.Write("<br/>");
        }
        void Write(string msg)
        {
            Writer.Write(msg);
        }

        string GetUrlOfObject(ClientContext clientContext, object o)
        {
            if (o is Web)
            {
                return ((Web)o).ServerRelativeUrl;
            }
            if (o is Site)
            {
                return ((Site)o).ServerRelativeUrl;
            }
            if (o is List)
            {
                List l = o as List;
                return l.ParentWebUrl + l.Title;
            }
            if (o is ListItem)
            {
                ListItem li = o as ListItem;
                if (li.FileSystemObjectType == FileSystemObjectType.File)
                {
                }
                clientContext.Load(li.File, f => f.ServerRelativeUrl);
                clientContext.ExecuteQuery();
                return li.File.ServerRelativeUrl;
            }
            return "";
        }

        public void EnumerateSiteCollectionForms(ClientContext clientContext, Web web)
        {
            clientContext.Load(web);
            clientContext.Load(web, w => w.ServerRelativeUrl, w => w.Title);
            clientContext.Load(web.Webs);
            clientContext.ExecuteQuery();

            if (m_verbose)
            {
                WriteLine("");
                WriteLine("===============================");
                WriteLine(string.Format("Site {0}", web.Title));
                WriteLine("===============================");
                WriteLine("");
            }

            EnumerateInfoPathFormContentTypes(clientContext, web);

            foreach (Web childWeb in web.Webs)
            {
                EnumerateSiteCollectionForms(clientContext, childWeb);
            }
        }

        void EnumerateInfoPathFormContentTypes(ClientContext clientContext, Web web)
        {
            // Process lists
            clientContext.Load(web.AvailableContentTypes,
                acts => acts.Where( act => act.Group == "Microsoft InfoPath" && act.Hidden == false)
                    .Include(
                    act => act.Description,
                    act => act.DisplayFormTemplateName,
                    act => act.DisplayFormUrl,
                    act => act.DocumentTemplate,
                    act => act.DocumentTemplateUrl,
                    act => act.EditFormTemplateName,
                    act => act.EditFormUrl,
                    act => act.Group,
                    act => act.Hidden,
                    act => act.Id,
                    act => act.Name,
                    act => act.NewFormTemplateName,
                    act => act.NewFormUrl,
                    act => act.ReadOnly,
                    act => act.SchemaXml,
                    act => act.Scope,
                    act => act.Sealed,
                    act => act.StringId));
            clientContext.ExecuteQuery();

            clientContext.Load(web.WorkflowAssociations,
                was => was.Include(
                    wa => wa.Name,
                    wa => wa.AutoStartChange,
                    wa => wa.AutoStartCreate, 
                    wa => wa.Created,
                    wa => wa.AllowManual));
            clientContext.ExecuteQuery();

            WriteLine("<DL>");
            if (web.WorkflowAssociations.Count > 0)
            {
                WriteLine("<STRONG>Associated Workflows{0}</STRONG>");
                foreach (WorkflowAssociation wa in web.WorkflowAssociations)
                {
                    WriteLine(string.Format("<li>{0}</li>", wa.Name));
                }
            }
            foreach (ContentType act in web.AvailableContentTypes)
            {
                XsnList.Add(act.DocumentTemplateUrl);

                WriteLine(string.Format("<STRONG>{0}</STRONG>", act.Name));
                WriteLine("<DL>");
                WriteDTDD( "Description", act.Description);
                WriteDTDD( "DisplayFormTemplateName", act.DisplayFormTemplateName);
                WriteDTDD( "DisplayFormUrl", act.DisplayFormUrl);
                WriteDTDD( "DocumentTemplate", act.DocumentTemplate);
                WriteDTDD( "DocumentTemplateUrl", act.DocumentTemplateUrl);
                WriteDTDD( "EditFormTemplateName", act.EditFormTemplateName);
                WriteDTDD( "EditFormUrl", act.EditFormUrl);
                WriteDTDD( "Group", act.Group);
                WriteDTDD( "Hidden", act.Hidden);
                WriteDTDD( "Id", act.Id);
                WriteDTDD( "NewFormTemplateName", act.NewFormTemplateName);
                WriteDTDD( "NewFormUrl", act.NewFormUrl);
                WriteDTDD( "ReadOnly", act.ReadOnly);
                //WriteDTDD( "SchemaXml", act.SchemaXml);
                WriteDTDD( "Scope", act.Scope);
                WriteDTDD( "Sealed", act.Sealed);
                WriteDTDD( "StringId", act.StringId);
                //WriteDTDD( "TypedObject", act.TypedObject);
                //WriteDTDD( "WorkflowAssociations", act.WorkflowAssociations);
                WriteLine("</DL>");
            }

            Write("<P><STRONG>XSN Summary</STRONG>");
            Write("<DL>");
            Write("<DT>");
            foreach (string xsnUrl in this.XsnList)
            {
                Write("<DD>");
                Write(xsnUrl);
                Write("</DD>");
            }
            Write("</DT>");
            WriteLine("</DL>");

            ListCollection collList = web.Lists;

            clientContext.Load(
                collList,
                lists => lists.Where(
                    list => list.Hidden == false && list.HasExternalDataSource == false).Include(
                        list => list.Title,
                        list => list.ParentWebUrl,
                        list => list.ContentTypesEnabled));
            clientContext.ExecuteQuery();

            foreach (List list in web.Lists)
            {
                clientContext.Load(list.ContentTypes,
                    ctypes => ctypes.Where(ctype => ctype.Name == "Form" /*|| ctype.Name == "InfoPath Form Template"*/)
                        .Include(
                        ctype => ctype.Name,
                        ctype => ctype.NewFormTemplateName,
                        ctype => ctype.DisplayFormTemplateName,
                        ctype => ctype.EditFormTemplateName,
                        ctype => ctype.DocumentTemplate,
                        ctype => ctype.DocumentTemplateUrl,
                        ctype => ctype.DisplayFormUrl));
                clientContext.ExecuteQuery();

                if (m_verbose)
                {
                    if (m_listHasOutput)
                    {
                        WriteLine("<br/>");
                    }
                    if (list.ContentTypes.Count == 0)
                    {
                        WriteLine(string.Format("<br/>List: {0}", HttpUtility.HtmlEncode(list.Title)));
                        WriteLine("<li>No InfoPath forms found for list</li>");
                    }
                    else
                    {
                        WriteLine(string.Format("<br/>List: {0}", HttpUtility.HtmlEncode(list.Title)));
                        Write("<table border='1'>");
                        Write("<tr>");
                        foreach (string colTitle in new string[] { "Content Type", "New Form", "Display Form", "Edit Form", "Doc Template", "Doc Template Url" })
                        {
                            Write(string.Format("<th>{0}</th>", colTitle));
                        }
                        Write("</tr>");
                        foreach (ContentType ct in list.ContentTypes)
                        {
                            Write("<tr>");
                            WriteTD(ct.Name);
                            WriteTD(ct.NewFormTemplateName);
                            WriteTD(ct.DisplayFormTemplateName);
                            WriteTD(ct.EditFormTemplateName);
                            WriteTD(ct.DocumentTemplate);
                            WriteTD(ct.DocumentTemplateUrl);
                            Write("</tr>");
                        }
                        Write("</table>");
                    }
                    m_newList = true;
                    m_listHasOutput = false;
                }
            }
            WriteLine("</DL>");
        }

        private void WriteTD(object value)
        {
            Write(string.Format("<td>{0}</td>", HttpUtility.HtmlEncode(value.ToString())));
        }

        private void WriteDTDD(string propName, object value)
        {
            string msg = string.Format("<DT>{0}</DT><DD>{1}</DD>", propName,value == null ? "" : HttpUtility.HtmlEncode(value.ToString()));
            WriteLine(msg);
        }
        #region Permissions
#if false
        // Add back if needed for permissions
        public void WritePermissionsForSite(ClientContext clientContext, string url, string userName)
        {
            clientContext.Credentials = System.Net.CredentialCache.DefaultNetworkCredentials;

            User user = clientContext.Web.EnsureUser(userName);

            EnumerateSiteCollectionForms(clientContext, clientContext.Web);
        }

        private const string c_InheritsRoleAssignmentsText = ""; //"Inherits role assignments"
        void WritePermissionsForSite(ClientContext clientContext, Web web, User user)
        {
            clientContext.Load(user);
            clientContext.Load(web);
            clientContext.Load(web, w => w.ServerRelativeUrl, w => w.HasUniqueRoleAssignments, w => w.Title);
            clientContext.Load(web.Webs);
            clientContext.ExecuteQuery();

            if (s_verbose)
            {
                WriteLine("");
                WriteLine("===============================");
                WriteLine(string.Format("Site {0} \t{1}", web.Title, web.HasUniqueRoleAssignments ? "*Has unique role assignments" : c_InheritsRoleAssignmentsText));
                WriteLine("===============================");
                WriteLine("");
            }
            if (web.HasUniqueRoleAssignments || s_firstWebProcessed)
            {
                WritePermissionsForGroups(clientContext, user, web);
                s_firstWebProcessed = false;
            }
            WritePermissionsForLists(clientContext, user, web);

            foreach (Web childWeb in web.Webs)
            {
                WritePermissionsForSite(clientContext, childWeb, user);
            }
        }

        void WritePermissionsForGroups(ClientContext clientContext, User searchForUserOrGroup, Web web)
        {
            HashSet<string> permissionLevels = new HashSet<string>();

            GroupCollection groups = web.SiteGroups;
            clientContext.Load(groups);
            clientContext.ExecuteQuery();

            foreach (var group in groups)
            {
                clientContext.Load(group, g => g.Users.Where(u => u.LoginName == searchForUserOrGroup.LoginName));
                clientContext.ExecuteQuery();

                foreach (var user in group.Users)
                {
                    RoleAssignmentCollection roleAssignments = web.RoleAssignments;
                    clientContext.Load(web, w => w.RoleAssignments.Where(ra => ra.Member.LoginName == group.LoginName ||
                        ra.Member.LoginName == user.LoginName));
                    clientContext.ExecuteQuery();

                    foreach (var ra in web.RoleAssignments)
                    {
                        clientContext.Load(ra.Member);
                        clientContext.Load(ra.RoleDefinitionBindings);
                        clientContext.ExecuteQuery();
                        foreach (var definition in ra.RoleDefinitionBindings)
                        {
                            clientContext.Load(definition);
                            clientContext.ExecuteQuery();
                            permissionLevels.Add(definition.Name);
                        }
                    }
                }
            }
            AddToPermFile(searchForUserOrGroup, web, web.ServerRelativeUrl, permissionLevels);
        }

        void WritePermissionsForObject(ClientContext clientContext, User user, SecurableObject so)
        {
            if (!so.HasUniqueRoleAssignments)
                return;

            HashSet<string> permissionLevels = new HashSet<string>();

            clientContext.Load(so.RoleAssignments, rac => rac.Where(ra => ra.Member.LoginName == user.LoginName));
            clientContext.ExecuteQuery();

            foreach (var ra in so.RoleAssignments)
            {
                clientContext.Load(ra.Member);
                clientContext.Load(ra.RoleDefinitionBindings);
                clientContext.ExecuteQuery();

                foreach (var definition in ra.RoleDefinitionBindings)
                {
                    clientContext.Load(definition);
                    clientContext.ExecuteQuery();
                    permissionLevels.Add(definition.Name);
                }
            }
            if (permissionLevels.Count > 0)
            {
                AddToPermFile(user, so, GetUrlOfObject(clientContext, so), permissionLevels);
            }
        }

        void WritePermissionsForLists(ClientContext clientContext, User user, Web web)
        {
            if (web.HasUniqueRoleAssignments)
            {
                WritePermissionsForObject(clientContext, user, web);
            }
            // Process lists

            ListCollection collList = web.Lists;

            clientContext.Load(
                collList,
                lists => lists.Where(
                    list => list.Hidden == false && list.HasExternalDataSource == false).Include(
                        list => list.Title,
                        list => list.ParentWebUrl,
                        list => list.HasUniqueRoleAssignments));

            clientContext.ExecuteQuery();

            foreach (List list in web.Lists)
            {
                if (s_verbose)
                {
                    if (s_listHasOutput)
                    {
                        WriteLine("<br/>");
                    }
                    WriteLine(string.Format("\tList {0} \t{1}", list.Title, list.HasUniqueRoleAssignments ? "*Has unique role assignments" : c_InheritsRoleAssignmentsText));
                    s_newList = true;
                    s_listHasOutput = false;
                }
                WritePermissionsForObject(clientContext, user, list);
                WritePermissionsForListItems(clientContext, user, list);
            }
        }

        void WritePermissionsForListItems(ClientContext clientContext, User user, List list)
        {
            ListItemCollectionPosition itemPosition = null;

            while (true)
            {
                CamlQuery camlQuery = new CamlQuery();

                camlQuery.ListItemCollectionPosition = itemPosition;
                camlQuery.ViewXml = "<View><ViewFields>" +
                                        "<FieldRef Name='ID'/>" +
                                        "<FieldRef Name='Title'/>" +
                                    "</ViewFields><RowLimit>50</RowLimit></View>";

                ListItemCollection collListItem = list.GetItems(camlQuery);

                clientContext.Load(collListItem,
                                 items => items.Where(item => item.HasUniqueRoleAssignments == true).Include(
                                    item => item.DisplayName,
                                    item => item.FileSystemObjectType,
                                    item => item.HasUniqueRoleAssignments));
                clientContext.Load(collListItem, item => item.ListItemCollectionPosition);
                clientContext.ExecuteQuery();

                itemPosition = collListItem.ListItemCollectionPosition;

                foreach (ListItem item in collListItem)
                {
                    WritePermissionsForObject(clientContext, user, item);
                }
                if (itemPosition == null)
                {
                    break;
                }
            }
        }

        void AddToPermFile(User user, object o, string url, HashSet<string> permissionLevels)
        {
            string objectTypeName = o.GetType().Name;
            foreach (string permissionLevel in permissionLevels)
            {
                if (s_verbose)
                {
                    if (s_newList)
                    {
                        WriteLine("<br/>");
                        s_newList = false;
                    }
                    WriteLine(string.Format("\t\t{0}, {1}, {2}, {3}", objectTypeName, user.LoginName, url, permissionLevel));
                    s_listHasOutput = true;
                }
            }
        }
#endif
        #endregion

    }
}
