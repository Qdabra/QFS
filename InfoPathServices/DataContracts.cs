using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Xml.Serialization;
using System.Linq;

namespace InfoPathServices
{
    [XmlRoot(Namespace = "http://schemas.microsoft.com/office/infopath/2003/myXSD/2017-02-08T04:48:30")]
    public class QdScanTemplate
    {
        [DataMember(Order = 0)]
        public FormInformation ResultInfo { get; set; }

        [DataMember(Order = 1)]
        public UserDetail UserInfo { get; set; }

        [XmlNamespaceDeclarations]
        public XmlSerializerNamespaces xmlns = new XmlSerializerNamespaces();

        public QdScanTemplate()
        {
            xmlns.Add("my", "http://schemas.microsoft.com/office/infopath/2003/myXSD/2017-02-08T04:48:30");

            ResultInfo = new FormInformation();
            UserInfo = new UserDetail();
        }
    }


    [DataContract]
    public class FormInformation
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "FormLevelInfo")]
        public FormLevelInfo FormLevel { get; set; }

        [DataMember(Order = 1)]
        public List<Property> FormProperties { get; set; }

        [DataMember(Order = 2)]
        public List<DataConnection> DataConnections { get; set; }

        [DataMember(Order = 3)]
        public List<ViewInfo> ViewInfos { get; set; }

        [DataMember(Order = 4)]
        public List<PromotedProperty> PromotedProperties { get; set; }

        [DataMember(Order = 5)]
        public List<DllInfo> DllInfos { get; set; }

        [DataMember(Order = 6)]
        public List<DetailingResult> DetailingResults { get; set; }

        [DataMember(Order = 7)]
        public List<MigrationAnalysisInfo> MigrationAnalysisInfos { get; set; }

        [XmlIgnore]
        public string XsnUrl { get; set; }

        [DataMember(Order = 8)]
        public List<QRulesInfo> QRulesInfos { get; set; }

        [XmlIgnore]
        public int Index { get; set; }

        public FormInformation() { }

        public FormInformation(FormLevelInfo formLevelInformation, List<Property> formProperties, List<DataConnection> dataConnections, List<ViewInfo> viewInfos, List<PromotedProperty> promotedProps, List<DllInfo> dllInfos, List<DetailingResult> detailingResults, List<QRulesInfo> qRulesInfos)
        {
            this.FormLevel = formLevelInformation;
            this.FormProperties = formProperties;
            this.DataConnections = dataConnections;
            this.ViewInfos = viewInfos;
            this.PromotedProperties = promotedProps;
            this.DllInfos = dllInfos;
            this.DetailingResults = detailingResults;
            this.QRulesInfos = qRulesInfos;
        }
    }

    [DataContract]
    public class Property
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "PropName")]
        public string Name { get; set; }

        [DataMember(Order = 1)]
        [XmlElement(ElementName = "PropValue")]
        public string Value { get; set; }

        public Property() { }

        public Property(string name, string value)
        {
            this.Name = name;
            this.Value = value;
        }
    }

    [DataContract]
    public class FormPropertyList
    {
        [DataMember]
        public List<Property> FormProperties { get; set; }

        public FormPropertyList()
        {
            FormProperties = new List<Property>();
        }

        public void Add(Property prop)
        {
            FormProperties.Add(prop);
        }

        public void Add(string key, string value)
        {
            Add(new Property(key, value));
        }

    }

    [DataContract]
    public class FormLevelInfo
    {

        [DataMember(Order = 0)]
        public string Level { get; set; }

        [DataMember(Order = 1)]
        public List<Qualifier> Qualifiers { get; set; }

        [DataMember(Order = 2)]
        public List<Recommendation> Recommendations { get; set; }

        public FormLevelInfo() { }

        public FormLevelInfo(string level, List<Qualifier> qualifiers, List<Recommendation> recommendations)
        {
            this.Level = level;
            this.Qualifiers = qualifiers;
            this.Recommendations = recommendations;
        }


    }

    [DataContract]
    public class Qualifier
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "QDescription")]
        public string Description { get; set; }

        public Qualifier() { }

        public Qualifier(string description)
        {
            this.Description = description;
        }

    }

    [DataContract]
    public class Recommendation
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "RDescription")]
        public string Description { get; set; }

        public Recommendation() { }

        public Recommendation(string description)
        {
            this.Description = description;
        }

    }


    [DataContract]
    public class DetailingResult
    {
        [DataMember(Order = 0)]
        public string Item { get; set; }

        [DataMember(Order = 1)]
        public string Status { get; set; }

        [DataMember(Order = 2)]
        public string Analysis { get; set; }

        public DetailingResult() { }

        public DetailingResult(string item, string status, string analysis)
        {
            this.Item = item;
            this.Status = status;
            this.Analysis = analysis;
        }

    }

    [DataContract]
    public class DataConnection
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "ConnectionName")]
        public string Name { get; set; }

        [DataMember(Order = 1)]
        public ConnectionType? ConnectionType { get; set; }

        [DataMember(Order = 2)]
        public bool? QueryOnLoad { get; set; }

        [DataMember(Order = 3)]
        public bool Udcx { get; set; }

        [DataMember(Order = 4)]
        public bool DefaultSubmit { get; set; }

        [DataMember(Order = 5)]
        public List<Property> DataConnectionProperties { get; set; }

        public DataConnection() { }

        public DataConnection(string name, ConnectionType? connectionType, bool? queryOnLoad, bool udcx, bool defaultSubmit, List<Property> propertyList)
        {
            this.Name = name;
            this.QueryOnLoad = queryOnLoad;
            this.ConnectionType = connectionType;
            this.Udcx = udcx;
            this.DefaultSubmit = defaultSubmit;
            this.DataConnectionProperties = propertyList;
        }
    }

    [DataContract]
    public class DataConnectionList
    {
        [DataMember]
        public List<DataConnection> DataConnections { get; set; }

        public DataConnectionList()
        {
            DataConnections = new List<DataConnection>();
        }

        public void Add(DataConnection dataConnection)
        {
            DataConnections.Add(dataConnection);
        }

    }

    [DataContract]
    public class DllInfo
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "DllName")]
        public string Name { get; set; }

        [DataMember(Order = 1)]
        [XmlElement(ElementName = "DllSize")]
        public long Size { get; set; }

        [DataMember(Order = 2)]
        [XmlElement(ElementName = "DllVersion")]
        public string Version { get; set; }

        public DllInfo() { }

        public DllInfo(string name, long size, string version)
        {
            this.Name = name;
            this.Size = size;
            this.Version = version;
        }

    }

    [DataContract]
    public class ViewInfo
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "ViewName")]
        public string Name { get; set; }

        [DataMember(Order = 1)]
        public string FileName { get; set; }

        [DataMember(Order = 2)]
        public int Length { get; set; }

        [DataMember(Order = 3)]
        public long Size { get; set; }

        public ViewInfo() { }

        public ViewInfo(string name, string filename, int length, long size)
        {
            this.Name = name;
            this.FileName = filename;
            this.Length = length;
            this.Size = size;
        }

    }

    [DataContract]
    public class MigrationAnalysisInfo
    {
        [DataMember(Order = 0)]
        public string IssueLevel { get; set; }

        [DataMember(Order = 1)]
        public string Description { get; set; }

        [DataMember(Order = 2)]
        public int FormControlCount { get; set; }

        public MigrationAnalysisInfo() { }

        public MigrationAnalysisInfo(string issueLevel, string description, int formControlCount)
        {
            this.IssueLevel = issueLevel;
            this.Description = description;
            this.FormControlCount = formControlCount;
        }
    }

    [DataContract]
    public class ViewInfoList
    {
        [DataMember]
        public List<ViewInfo> ViewInfos { get; set; }

        public ViewInfoList()
        {
            ViewInfos = new List<ViewInfo>();
        }

        public void Add(ViewInfo viewInfo)
        {
            ViewInfos.Add(viewInfo);
        }
    }

    [DataContract]
    public class ListItemId
    {
        [DataMember]
        public int Id { get; set; }

        public ListItemId() { }

        public ListItemId(int id)
        {
            this.Id = id;
        }
    }

    [DataContract]
    public class ListItemIdList
    {
        [DataMember]
        public List<ListItemId> ListItemIds { get; set; }

        public ListItemIdList()
        {
            ListItemIds = new List<ListItemId>();
        }

        public void Add(ListItemId id)
        {
            ListItemIds.Add(id);

        }

    }

    [DataContract]
    public class LibraryItem
    {
        [DataMember]
        public Uri Link { get; set; }
        [DataMember]
        public int Id { get; set; }

        public LibraryItem() { }

        public LibraryItem(Uri link, int id)
        {
            this.Link = link;
            this.Id = id;
        }

    }

    [DataContract]
    public class FormFile
    {
        [DataMember]
        public string Name { get; set; }
        [DataMember]
        public string Contents { get; set; }

        public FormFile() { }

        public FormFile(string name, string contents)
        {
            this.Name = name;
            this.Contents = contents;
        }
    }

    [DataContract]
    public class PreprocessedViewFile
    {
        [DataMember]
        public string Name { get; set; }
        [DataMember]
        public string Head { get; set; }
        [DataMember]
        public string Main { get; set; }

        public PreprocessedViewFile() { }

        public PreprocessedViewFile(string name, string head, string main)
        {
            this.Name = name;
            this.Head = head;
            this.Main = main;
        }
    }

    [DataContract]
    public class ManifestFileWithProperties
    {
        const string KeyInstanceId = "instanceId";

        [DataMember]
        public FormPropertyList FormProperties { get; set; }
        [DataMember]
        public FormFile FormFile { get; set; }

        public ManifestFileWithProperties() { }
        public ManifestFileWithProperties(FormPropertyList formProperties, FormFile formFile)
        {
            this.FormProperties = formProperties;
            this.FormFile = formFile;
        }

        public string GetInstanceId()
        {
            if (FormProperties == null)
            {
                return null;
            }

            var formProperties = FormProperties.FormProperties;

            return GetPropertyValue(formProperties, KeyInstanceId);
        }

        private string GetPropertyValue(List<Property> properties, string propertyKey)
        {
            if (properties == null || properties.Count == 0)
            {
                return null;
            }

            var filterProperty = properties.Where(x => x.Name == propertyKey);

            if (!filterProperty.Any())
            {
                return null;
            }

            return filterProperty.FirstOrDefault().Value;
        }
    }

    [DataContract]
    public class PromotedProperty
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "PPName")]
        public string Name { get; set; }

        [DataMember(Order = 1)]
        public string NodePath { get; set; }

        [DataMember(Order = 2)]
        public string DataType { get; set; }

        [DataMember(Order = 3)]
        public string Aggregation { get; set; }

        public PromotedProperty() { }

        public PromotedProperty(string name, string nodePath, string dataType, string aggregation)
        {
            this.Name = name;
            this.NodePath = nodePath;
            this.DataType = dataType;
            this.Aggregation = aggregation;
        }
    }

    [DataContract]
    public class FormFileRequest
    {
        [DataMember]
        public string Format { get; set; }
        [DataMember]
        public string FileName { get; set; }
        [DataMember]
        public byte[] Form { get; set; }

        public FormFileRequest() { }
        public FormFileRequest(string format, string filename, byte[] form)
        {
            this.Format = format;
            this.FileName = filename;
            this.Form = form;
        }

    }

    public enum ConnectionType
    {
        //using the same case as is used in the manifest
        adoAdapter,
        webServiceAdapter,
        xmlFileAdapter,
        sharepointListAdapter,
        sharepointListAdapterRW,
        davAdapter,
        emailAdapter,
        submitToHostAdapter,
        hwsAdapter
    }

    [DataContract]
    public class QRulesInfo
    {
        [DataMember(Order = 0)]
        [XmlElement(ElementName = "QRuleName")]
        public string Name { get; set; }

        [DataMember(Order = 1)]
        [XmlElement(ElementName = "QRuleCount")]
        public int Count { get; set; }

        [DataMember(Order = 2)]
        public bool FVSupported { get; set; }

        public QRulesInfo() { }

        public QRulesInfo(string name, bool fvSupported)
        {
            this.Name = name;
            this.Count = 1;
            this.FVSupported = fvSupported;
        }

    }

    [DataContract]
    public class UserDetail
    {
        [DataMember(Order = 0)]
        public string UserName { get; set; }

        [DataMember(Order = 1)]
        public string Email { get; set; }

        public UserDetail()
        {

        }

        public UserDetail(string userName, string email)
        {
            UserName = userName;
            Email = email;
        }
    }
}