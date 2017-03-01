using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace QFSWeb.Encryption
{
    partial class Commands
    {
        internal static bool Decrypted(string decryptedData)
        {
            bool decrypted = false;

            if (decryptedData.StartsWith(DECRYPTED_PREFIX))
            {
                decrypted = true;
            }

            return decrypted;
        }

        internal static string RemovePrefix(string data, bool encrypted)
        {
            if (encrypted && data.StartsWith(ENCRYPTED_PREFIX))
            {
                data = data.Remove(0, ENCRYPTED_PREFIX.Length);
            }

            if (!encrypted && data.StartsWith(DECRYPTED_PREFIX))
            {
                data = data.Remove(0, DECRYPTED_PREFIX.Length);
            }

            return data;
        }

        internal static string UnpadData(string decryptedData)
        {
            //find out if data is the correct length
            int paddingUsed = decryptedData.Length % 4;

            //remove padding till it is
            if (paddingUsed > 0)
            {
                decryptedData = decryptedData.Substring(0, decryptedData.Length - paddingUsed);
            }

            return decryptedData;

        }
        
        internal static string DecryptString(string InputText, string Password)
        {
            /*source: http://dotnet.org.za/deon/pages/2998.aspx
             * see also: http://www.codeproject.com/KB/cs/Data_Encryption.aspx, 
             * http://stackoverflow.com/questions/1629828/how-to-encrypt-a-string-in-net/1629927,
             * http://www.obviex.com/samples/Encryption.aspx
             * http://msdn.microsoft.com/en-us/library/system.security.cryptography.rijndaelmanaged.aspx*/

            RijndaelManaged rijndaelCipher = new RijndaelManaged();

            byte[] encryptedData = Convert.FromBase64String(InputText);
            byte[] salt = Encoding.ASCII.GetBytes(Password.Length.ToString());

            PasswordDeriveBytes key = new PasswordDeriveBytes(Password, salt);

            // Create a decryptor from the existing key bytes.
            ICryptoTransform decryptor = rijndaelCipher.CreateDecryptor(key.GetBytes(32), key.GetBytes(16));

            MemoryStream memoryStream = new MemoryStream(encryptedData);

            // Create a CryptoStream, always use read mode to decrypt
            CryptoStream cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read);

            // Since at this point we don't know what the size of decrypted data
            // will be, allocate the buffer long enough to hold EncryptedData;
            // DecryptedData is never longer than EncryptedData.
            byte[] plainText = new byte[encryptedData.Length];

            // Start decrypting.
            int decryptedCount = cryptoStream.Read(plainText, 0, plainText.Length);

            memoryStream.Close();
            cryptoStream.Close();

            //Clear CryptoStream
            cryptoStream.Clear();

            // Convert decrypted data into a string. 
            string decryptedData = Encoding.Unicode.GetString(plainText, 0, decryptedCount);

            // Return decrypted string.   
            return decryptedData;
        }

    }
}