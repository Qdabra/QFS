using InfoPathServices;
using System;
using System.Collections.Generic;

namespace QFSWeb.Models
{
    public class ScanTemplateInfo
    {
        public List<string> Messages { get; set; }
        public List<FormInformation> FormInfos { get; set; }

        public ScanTemplateInfo()
        {
            Messages = new List<string>();
            FormInfos = new List<FormInformation>();
        }

        public void AddMessage(string message)
        {
            if (!String.IsNullOrWhiteSpace(message))
            {
                Messages.Add(message);
            }
        }
    }
}