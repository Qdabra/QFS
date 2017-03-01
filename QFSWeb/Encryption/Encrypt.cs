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
        private const string ENCRYPTED_PREFIX = "qdEncrypted";
        private const string DECRYPTED_PREFIX = "qdDecrypted";
        private const char PADDING = '=';

        internal static string AddPrefix(string data, bool encrypted)
        {
            if (encrypted && !data.StartsWith(ENCRYPTED_PREFIX))
            {
                data = ENCRYPTED_PREFIX + data;
            }

            if (!encrypted && !data.StartsWith(DECRYPTED_PREFIX))
            {
                data = DECRYPTED_PREFIX + data;
            }

            return data;
        }

        internal static string PadData(string encryptedData)
        {
            //find out if data is the correct length
            int paddingNeeded = encryptedData.Length % 4;

            //pad till it is
            if (paddingNeeded > 0)
            {
                encryptedData = encryptedData.PadRight(encryptedData.Length + 4 - paddingNeeded, PADDING);
            }

            return encryptedData;
        }

        internal static string EncryptString(string InputText, string Password)
        {
            /*source: http://dotnet.org.za/deon/pages/2998.aspx
             * see also: http://www.codeproject.com/KB/cs/Data_Encryption.aspx, 
             * http://stackoverflow.com/questions/1629828/how-to-encrypt-a-string-in-net/1629927,
             * http://www.obviex.com/samples/Encryption.aspx
             * http://msdn.microsoft.com/en-us/library/system.security.cryptography.rijndaelmanaged.aspx*/

            RijndaelManaged rijndaelCipher = new RijndaelManaged();

            //To byte array
            byte[] plainText = System.Text.Encoding.Unicode.GetBytes(InputText);

            // While the salt should be a cryptographically random number, we have no place to store that information
            // so are using password length to offer slightly greater security against a dictionary attack
            byte[] salt = Encoding.ASCII.GetBytes(Password.Length.ToString());

            // The key will be generated from the specified 
            // password and salt.
            PasswordDeriveBytes key = new PasswordDeriveBytes(Password, salt);

            // Create a encryptor from the existing key bytes.
            //  32 bytes for the key 
            // (the default Rijndael key length is 256 bit = 32 bytes) and
            // then 16 bytes for the IV (initialization vector),
            // (the default Rijndael IV length is 128 bit = 16 bytes)
            ICryptoTransform encryptor = rijndaelCipher.CreateEncryptor(key.GetBytes(32), key.GetBytes(16));

            // Create a MemoryStream for the encrypted bytes 
            MemoryStream memoryStream = new MemoryStream();

            // Create a CryptoStream through which we are going to be processing our data. 
            // CryptoStreamMode.Write means that we are going to be writing data 
            // to the stream and the output will be written in the MemoryStream
            // we have provided. (always use write mode for encryption)
            CryptoStream cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write);

            // Start the encryption process.
            cryptoStream.Write(plainText, 0, plainText.Length);

            // Finish encrypting.
            cryptoStream.FlushFinalBlock();

            // Convert our encrypted data from a memoryStream into a byte array.
            byte[] CipherBytes = memoryStream.ToArray();

            // Close both streams.
            memoryStream.Close();
            cryptoStream.Close();

            // Convert encrypted data into a base64-encoded string.
            string encryptedData = Convert.ToBase64String(CipherBytes);

            //Clear the CryptoStream 
            cryptoStream.Clear();

            // Return encrypted string.
            return encryptedData;
        }
    }
}