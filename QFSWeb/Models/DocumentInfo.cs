using Microsoft.SharePoint.Client;
using System;
using System.Collections.Generic;

namespace QFSWeb.Models
{
    public class DocumentInfo
    {
        public List<string> Messages { get; set; }
        public List<ListItemInfo> ItemInfo { get; set; }

        public DocumentInfo()
        {
            Messages = new List<string>();
            ItemInfo = new List<ListItemInfo>();
        }

        public void AddMessage(string message)
        {
            if (!String.IsNullOrWhiteSpace(message))
            {
                Messages.Add(message);
            }
        }
    }

    public class ListItemInfo
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Url { get; set; }

        public ListItemInfo(ListItem item)
        {
            Id = item.Id;
            Title = item.FieldValues.ContainsKey("FileLeafRef") ? item.FieldValues["FileLeafRef"].ToString() : string.Empty;
            Url = item.FieldValues.ContainsKey("FileRef") ? item.FieldValues["FileRef"].ToString() : string.Empty;
        }
    }
}