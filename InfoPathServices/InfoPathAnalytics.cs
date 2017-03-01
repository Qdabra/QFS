using System;
using System.Collections.Generic;
using System.IO;
//using System.ServiceModel.Web;
using System.Web;
using System.ServiceModel.Activation;
using System.Security.Claims;
using Microsoft.SharePoint.Client;

namespace InfoPathServices
{
    public class InfoPathAnalytics
    {
        public InfoPathAnalytics()
        {
        }
        internal static string manifestPath = "manifest.xsf";
        internal static string TemplateDefaultName = "__template__.xsn";

        public static Stream TemplateFile(ClientContext context, string libraryUrl, string xsnUrl, string fileName)
        {
            return Utilities.GetFormFileStream(context, libraryUrl, xsnUrl, fileName);
        }

        public static FormFile FormFileContents(ClientContext context, string libraryUrl, string xsnUrl, string fileName)
        {
            return Utilities.GetFormFile(context, libraryUrl, xsnUrl, fileName);
        }

        public static FormFile FormFileContentsFromFormFileRequest(FormFileRequest formFileRequest)
        {
            string workingName = Utilities.GenerateWorkingName();
            string templateFileName = Utilities.GenerateTemplateFilePath(workingName);

            System.IO.File.WriteAllBytes(templateFileName, formFileRequest.Form);

            return new FormFile(formFileRequest.FileName, Utilities.GetFileText(templateFileName, formFileRequest.FileName));

        }

        public static FormPropertyList AllFormProperties(ClientContext context, string libraryUrl, string xsnUrl)
        {
            FormPropertyList propList = new FormPropertyList();
            XsnWrapper xsnWrapper = new XsnWrapper(Utilities.DownloadXsn(context, libraryUrl, xsnUrl));
            propList.FormProperties = xsnWrapper.GetAllXsnProperties();
            xsnWrapper.Dispose();

            return propList;
        }

        public static FormPropertyList AllFormPropertiesFromFormFileRequest(FormFileRequest formFileRequest)
        {
            FormPropertyList propList = new FormPropertyList();
            XsnWrapper xsnWrapper = new XsnWrapper(Utilities.SaveFormFileRequest(formFileRequest));
            propList.FormProperties = xsnWrapper.GetAllXsnProperties();
            xsnWrapper.Dispose();

            return propList;
        }

        public static FormInformation FormInformation(ClientContext context, string libraryUrl, string xsnUrl)
        {
            using (XsnWrapper xsnWrapper = new XsnWrapper(Utilities.DownloadXsn(context, libraryUrl, xsnUrl)))
            {
                FormInformation formInfo = Utilities.GenerateFormInformation(xsnWrapper);
                return formInfo;
            }
        }

        public static FormInformation FormInformation(ClientContext context, Microsoft.SharePoint.Client.File file)
        {
            using (XsnWrapper xsnWrapper = new XsnWrapper(Utilities.DownloadXsn(context, file)))
            {
                FormInformation formInfo = Utilities.GenerateFormInformation(xsnWrapper);
                return formInfo;
            }
        }

        public static FormInformation FormInformation(Stream fileStream)
        {
            string templateFilename = Utilities.CopyXsnLocal(fileStream);
            using (XsnWrapper xsnWrapper = new XsnWrapper(templateFilename))
            {
                FormInformation formInfo = Utilities.GenerateFormInformation(xsnWrapper);
                return formInfo;
            }


        }

        public static FormInformation FormInformationFromFormFileRequest(FormFileRequest formFileRequest)
        {
            XsnWrapper xsnWrapper = new XsnWrapper(Utilities.SaveFormFileRequest(formFileRequest));
            FormInformation formInfo = Utilities.GenerateFormInformation(xsnWrapper);
            xsnWrapper.Dispose();

            return formInfo;
        }

        public static ManifestFileWithProperties ManifestWithProperties(ClientContext context, string libraryUrl, string xsnUrl)
        {
            using (XsnWrapper xsnWrapper = new XsnWrapper(Utilities.DownloadXsn(context, libraryUrl, xsnUrl)))
            {
                FormPropertyList propList = new FormPropertyList
                {
                    FormProperties = xsnWrapper.GetAllXsnProperties()
                };
                return new ManifestFileWithProperties(propList, new FormFile(manifestPath, xsnWrapper.Manifest.Manifest.OuterXml));
            }
        }

        public static ManifestFileWithProperties ManifestWithPropertiesFromFormFileRequest(FormFileRequest formFileRequest)
        {
            FormPropertyList propList = new FormPropertyList();
            XsnWrapper xsnWrapper = new XsnWrapper(Utilities.SaveFormFileRequest(formFileRequest));
            propList.FormProperties = xsnWrapper.GetAllXsnProperties();
            xsnWrapper.Dispose();

            return new ManifestFileWithProperties(propList, new FormFile(manifestPath, xsnWrapper.Manifest.Manifest.OuterXml));
        }

        public static PreprocessedViewFile PreprocessedView(string viewXslt, string viewFileName, Dictionary<string, string> parameters)
        {
            var head = Utilities.GetTransformedString(viewXslt, "ExtractViewHead.xslt", parameters);
            var main = Utilities.GetTransformedString(viewXslt, "PreProcessView.xslt", parameters, allowScript: true);

            return new PreprocessedViewFile(viewFileName, head, main);
        }

        public static PreprocessedViewFile PreprocessedView(string viewXslt, string viewFileName, string paramNames, string paramValues)
        {
            var parameters = Utilities.GenerateParameterDictionary(paramNames, paramValues);

            return PreprocessedView(viewXslt, viewFileName, parameters);
        }

        public static PreprocessedViewFile PreprocessedView(ClientContext context, string libraryUrl, string xsnUrl, string viewName, string format, string paramNames, string paramValues)
        {
            var viewXsl = FormFileContents(context, libraryUrl, xsnUrl, viewName);

            return PreprocessedView(viewXsl.Contents, viewName, paramNames, paramValues);
        }

        public static PreprocessedViewFile PreprocessedViewFromFormFileRequest(FormFileRequest viewRequest, Dictionary<string, string> parameters)
        {
            var viewXsl = FormFileContentsFromFormFileRequest(viewRequest);

            return PreprocessedView(viewXsl.Contents, viewRequest.FileName, parameters);
        }

        public static Property FormVersion(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);

            return manifest.GetSolutionVersion();
        }

        public static FormPropertyList FormCompatibility(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);

            FormPropertyList properties = new FormPropertyList();
            properties.Add(manifest.GetInitialCaption());
            properties.Add(manifest.GetInfoPathVersion());
            properties.Add(manifest.BrowserCompatible());

            return properties;
        }

        public static FormPropertyList FormName(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);

            FormPropertyList properties = new FormPropertyList();
            properties.Add(manifest.GetInitialCaption());
            properties.Add(manifest.GetId());

            return properties;
        }

        public static FormPropertyList FormSecuritySettings(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);

            FormPropertyList propertyList = new FormPropertyList();
            propertyList.Add(manifest.GetInitialCaption());
            propertyList.Add(manifest.GetTrustSetting());
            propertyList.Add(manifest.GetTrustLevel());

            return propertyList;
        }

        public static Property DataConnectionCount(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);

            return manifest.GetDataConnectionCount();
        }

        public static Property ViewCount(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);
            return manifest.GetViewCount();
        }

        public static DataConnectionList DataConnections(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ManifestWrapper manifest = new ManifestWrapper(FormFileContents(context, libraryUrl, xsnUrl, manifestPath).Contents);

            DataConnectionList dcList = new DataConnectionList();
            dcList.DataConnections = manifest.GetAllDataConnectionInfo();

            return dcList;
        }

        public static ViewInfoList Views(ClientContext context, string libraryUrl, string xsnUrl)
        {
            ViewInfoList viewInfos = new ViewInfoList();
            XsnWrapper xsnWrapper = new XsnWrapper(Utilities.DownloadXsn(context, libraryUrl, xsnUrl));
            viewInfos.ViewInfos = Utilities.GetViewInfos(xsnWrapper);
            xsnWrapper.Dispose();

            return viewInfos;
        }
    }
}
