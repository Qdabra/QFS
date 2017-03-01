using System;
using System.Collections.Specialized;
using System.Linq;
using System.Net;
using System.Text;

namespace QFSWeb.Utilities
{
     // Code here is from http://stackoverflow.com/a/30049848/1945651 with small modifications
    public static class WebClientExtensions
    {
        private static readonly Encoding DefaultEncoding = Encoding.UTF8;

        public static string DownloadStringDetectEncoding(this WebClient webClient, string uri)
        {
            return DownloadStringDetectEncoding(webClient, new Uri(uri));
        }

        public static string DownloadStringDetectEncoding(this WebClient webClient, Uri uri)
        {
            var rawData = webClient.DownloadData(uri);
            var encoding = WebUtils.GetEncodingFrom(webClient.ResponseHeaders, defaultEncoding: DefaultEncoding);
            return encoding.GetString(rawData);
        }

        public static string UploadStringDetectEncoding(this WebClient webClient, string uri, string data)
        {
            return UploadStringDetectEncoding(webClient, new Uri(uri), data);
        }

        public static string UploadStringDetectEncoding(this WebClient webClient, Uri uri, string data)
        {
            return UploadStringDetectEncoding(webClient, uri, data, DefaultEncoding);
        }

        public static string UploadStringDetectEncoding(this WebClient webClient, Uri uri, string data, Encoding uploadEncoding)
        {
            var rawData = webClient.UploadData(uri, uploadEncoding.GetBytes(data));
            var encoding = WebUtils.GetEncodingFrom(webClient.ResponseHeaders, defaultEncoding: DefaultEncoding);
            return encoding.GetString(rawData);
        }
    }

    public static class WebUtils
    {
        public static Encoding GetEncodingFrom(
            NameValueCollection responseHeaders,
            Encoding defaultEncoding = null)
        {
            if (responseHeaders == null)
            {
                throw new ArgumentNullException("responseHeaders");
            }

            //Note that key lookup is case-insensitive
            var contentType = responseHeaders["Content-Type"];
            if (contentType == null)
            {
                return defaultEncoding;
            }

            var contentTypeParts = contentType.Split(';');
            if (contentTypeParts.Length <= 1)
            {
                return defaultEncoding;
            }

            var charsetPart =
                contentTypeParts.Skip(1).FirstOrDefault(
                    p => p.TrimStart().StartsWith("charset", StringComparison.InvariantCultureIgnoreCase));

            if (charsetPart == null)
            {
                return defaultEncoding;
            }

            var charsetPartParts = charsetPart.Split('=');
            if (charsetPartParts.Length != 2)
            {
                return defaultEncoding;
            }

            var charsetName = charsetPartParts[1].Trim();
            if (charsetName == "")
            {
                return defaultEncoding;
            }

            try
            {
                return Encoding.GetEncoding(charsetName);
            }
            catch (ArgumentException ex)
            {
                throw new ApplicationException("Unknown encoding type: " + charsetName, ex);
            }
        }
    }
}