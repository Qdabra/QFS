using System;
using System.IO;
using System.Text;

namespace InfoPathServices
{

   internal static class Base64Helper
    {
       internal const string BASE64_SIGNATURE_ATTACHMENT = "x0lG";
        private static readonly byte[] ATTACHMENT_HEADER_BYTES = Convert.FromBase64String(BASE64_SIGNATURE_ATTACHMENT);
        internal const string BASE64_SIGNATURE_GIF = "R0lG";
        internal const string BASE64_SIGNATURE_JPG = "/9j/";
        internal const string BASE64_SIGNATURE_PNG = "iVBO";
        internal const string BASE64_SIGNATURE_TIF = "SUkq";
        private const string BASE64_PICTURE_FILENAME = "Picture";

        internal static void GetBase64Values(string base64Value, out string fileName, out string fileExtension, out int fileSize, out byte[] file)
        {
            if (base64Value.StartsWith(BASE64_SIGNATURE_ATTACHMENT)) // Attachment.
            {
                int FIXED_HEADER = 16;
                byte[] data = Convert.FromBase64String(base64Value);
                using (MemoryStream ms = new MemoryStream(data))
                {
                    BinaryReader br = new BinaryReader(ms);
                    byte[] header = new byte[FIXED_HEADER];
                    header = br.ReadBytes(header.Length);

                    // FileSize
                    fileSize = (int)br.ReadUInt32();

                    // FileName
                    int fileNameLength = (int)br.ReadUInt32() * 2;
                    byte[] fileNameBytes = br.ReadBytes(fileNameLength);
                    fileName = Encoding.Unicode.GetString(fileNameBytes, 0, fileNameLength - 2);

                    // FileExtension
                    int li = fileName.LastIndexOf('.');
                    fileExtension = (li > 0) ? fileName.Substring(li + 1) : String.Empty;

                    // Attachment
                    file = br.ReadBytes(fileSize);
                }
            }
            else // Picture.
            {
                switch (base64Value.Substring(0, 4))
                {
                    case BASE64_SIGNATURE_GIF: fileExtension = ".gif"; break;
                    case BASE64_SIGNATURE_JPG: fileExtension = ".jpg"; break;
                    case BASE64_SIGNATURE_PNG: fileExtension = ".png"; break;
                    default: fileExtension = ".bmp"; break;
                }

                fileName = BASE64_PICTURE_FILENAME + fileExtension;
                file = Convert.FromBase64String(base64Value);
                fileSize = file.Length;
            }
        }
    }

    internal static class Base64
    {
        internal static string GetBase64Attachment(byte[] file, string fileName)
        {
            byte[] fileNameBytes = Encoding.Unicode.GetBytes(fileName);
            using (MemoryStream ms = new MemoryStream())
            {
                BinaryWriter bw = new BinaryWriter(ms);
                // Write the InfoPath attachment signature. 
                bw.Write(new byte[] { 0xC7, 0x49, 0x46, 0x41 });

                // Write the default header information.
                bw.Write((uint)0x14);	// size
                bw.Write((uint)0x01);	// version
                bw.Write((uint)0x00);	// reserved

                bw.Write((uint)file.Length);
                bw.Write((uint)fileName.Length + 1);

                bw.Write(fileNameBytes);
                // filename termination character
                bw.Write(new byte[] { 0, 0 });

                bw.Write(file);

                ms.Position = 0;
                BinaryReader br = new BinaryReader(ms);
                return Convert.ToBase64String(br.ReadBytes((int)ms.Length));
            }
        }
    }
}