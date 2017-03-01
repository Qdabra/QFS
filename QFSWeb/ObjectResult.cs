using System;
using System.Web;
using System.Web.Mvc;
using System.Xml.Serialization;
using System.IO;
using System.Text;
using System.Xml;
using System.Web.Script.Serialization;
using Newtonsoft.Json;
using Formatting = Newtonsoft.Json.Formatting;

namespace QFSWeb
{
    public class ObjectResult<T> : ActionResult
    {
        const bool c_indentXml = false;
        const bool c_indentJson = false;
        const bool c_indentJsonP = false;

        private static UTF8Encoding UTF8 = new UTF8Encoding(false);
        const string FormatDefault = "xml";

        public T Data { get; set; }


        public Type[] IncludedTypes = new[] { typeof(object) };


        public ObjectResult(T data)
        {
            this.Data = data;
        }


        public ObjectResult(T data, Type[] extraTypes)
        {
            this.Data = data;
            this.IncludedTypes = extraTypes;
        }


        public override void ExecuteResult(ControllerContext context)
        {
            HttpRequestBase request = context.HttpContext.Request;

            // If ContentType is not expected to be application/json, then return XML
            if (request["jsoncallback"] != null)
            {
                SerializeToJsonp_jsoncallback(context);
            }
            else if (request["callback"] != null)
            {
                SerializeToJsonp_callback(context);
            }
            else if (request["json"] != null)
            {
                SerializeToJson(context);
            }
            else if ((request.ContentType ?? string.Empty).Contains("application/json"))
            {
                SerializeToJson(context);
            }
            else if ((request.ContentType ?? string.Empty).Contains("application/xml"))
            {
                SerializeToXml(context);
            }
            else
            {
                string format = request.Params["format"] ?? FormatDefault; // TODO: make default changable
                if (format == "json")
                    SerializeToJson(context);
                else if (format == "xml")
                    SerializeToXml(context);
                else
                    SerializeToJson(context); // make default overridable
            }
        }


        private void SerializeToJson(ControllerContext context)
        {
#if false
            var result = JsonConvert.SerializeObject(this.Data, (c_indentJson ? Formatting.Indented : Formatting.None));
            new ContentResult
            {
                ContentType = "application/json",
                Content = result,
                ContentEncoding = UTF8
            }
            .ExecuteResult(context);
#else
            HttpResponseBase response = context.HttpContext.Response;
            JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer
                {
                    MaxJsonLength = Int32.MaxValue
                };
            //if (this.MaxJsonLength.HasValue)
            //{
            //    javaScriptSerializer.MaxJsonLength = this.MaxJsonLength.Value;
            //}
            //if (this.RecursionLimit.HasValue)
            //{
            //    javaScriptSerializer.RecursionLimit = this.RecursionLimit.Value;
            //}
            response.Write(javaScriptSerializer.Serialize(this.Data));
#endif
        }


        private void SerializeToJsonp_jsoncallback(ControllerContext context)
        {
            SerializeToJsonp(context, "jsoncallback");
        }
        private void SerializeToJsonp_callback(ControllerContext context)
        {
            SerializeToJsonp(context, "callback");
        }
        private void SerializeToJsonp(ControllerContext context, string callbackkey)
        {
            var result = HttpContext.Current.Request.Params[callbackkey] + "(" +
                JsonConvert.SerializeObject(this.Data, (c_indentJsonP ? Formatting.Indented : Formatting.None)) + ")";
            new ContentResult
            {
                ContentType = "application/javascript",
                Content = result,
                ContentEncoding = UTF8
            }
            .ExecuteResult(context);
        }


        private void SerializeToXml(ControllerContext context)
        {
            using (var stream = new MemoryStream(60 * 1024))
            {
                using (var xmlWriter =
                    XmlTextWriter.Create(stream,
                                         new XmlWriterSettings()
                                         {
                                             OmitXmlDeclaration = true,
                                             Encoding = UTF8,
                                             Indent = c_indentXml
                                         }))
                {
                    new XmlSerializer(typeof(T), IncludedTypes)
                        .Serialize(xmlWriter, this.Data);
                }
                // NOTE: We need to cache XmlSerializer for specific type. Probably use the 
                // GenerateSerializer to generate compiled custom made serializer for specific
                // types and then cache the reference
                new ContentResult
                {
                    ContentType = "text/xml",
                    Content = UTF8.GetString(stream.ToArray()),
                    ContentEncoding = UTF8
                }
                    .ExecuteResult(context);
            }
        }
    }
}