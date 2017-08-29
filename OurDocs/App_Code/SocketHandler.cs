using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.Web.WebSockets;
using System.Web.Helpers;
using System.IO;
using OurDocs.Models;
using System.Text;

/// <summary>
/// Summary description for WebSocketHandler
/// </summary>

namespace OurDocs {
    public class SocketHandler : WebSocketHandler
    {
        private static string appData = HttpContext.Current.Server.MapPath("/App_Data/OurDocs/");
        private static WebSocketCollection socketCollection;
        public static WebSocketCollection SocketCollection
        {
            get
            {
                if (socketCollection == null)
                {
                    socketCollection = new WebSocketCollection();
                }
                return socketCollection;
            }
            set
            {
                socketCollection = value;
            }
        }
        public SocketHandler()
        {
            Username = "Unnamed User";
        }
        public override void OnOpen()
        {
            SocketCollection.Add(this);
            SessionID = WebSocketContext.Cookies["ASP.NET_SessionId"].Value;
            var request = new
            {
                Type = "SessionID",
                SessionID = SessionID,
            };
            Send(Json.Encode(request));
        }
        public override void OnMessage(string message)
        {
            var jsonMessage = Json.Decode(message);
            string type = jsonMessage.Type;
            switch (type)
            {
                case "NotebookID":
                    {
                        NotebookID = jsonMessage.NotebookID;
                        sendUsers();
                        break;
                    }
                case "SetUsername":
                    {
                        Username = jsonMessage.Username;
                        sendUsers();
                        break;
                    }
                case "Chat":
                    {
                        jsonMessage.DateTime = DateTime.Now.ToString();
                        sendToPartners(Json.Encode(jsonMessage));
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        jsonNotebook.ChatMessages.Add(Convert.ToBase64String(Encoding.UTF8.GetBytes(Json.Encode(jsonMessage))));
                        while (jsonNotebook.ChatMessages.Count > 50)
                        {
                            File.AppendAllText(appData + "Notebooks\\" + NotebookID + "-Chat_History.json", Json.Encode(jsonNotebook.ChatMessages[0]) + Environment.NewLine);
                            jsonNotebook.ChatMessages.RemoveAt(0);
                        }
                        File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                        break;
                    }
                case "AddDocument":
                    {
                        var newDoc = new Document();
                        newDoc.DocumentName = "New Document";
                        newDoc.NotebookID = NotebookID;
                        File.WriteAllText(appData + "Documents\\" + newDoc.DocumentID + ".json", Json.Encode(newDoc));
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        jsonNotebook.Documents.Add(new DocumentEntry(newDoc.DocumentID, newDoc.DocumentName));
                        sortDocuments(jsonNotebook);
                        File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                        var request = new
                        {
                            Type = "AddDocument",
                            Document = newDoc,
                            SessionID = SessionID,
                            Username = Username,
                        };
                        sendToPartners(Json.Encode(request));
                        break;
                    }
                case "DeleteDocument":
                    {
                        File.Delete(appData + "Documents\\" + jsonMessage.DocumentID + ".json");
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        jsonNotebook.Documents.RemoveAll(de => de.DocumentID == jsonMessage.DocumentID);
                        File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                        var request = new
                        {
                            Type = "DeleteDocument",
                            DocumentID = jsonMessage.DocumentID,
                            SessionID = SessionID,
                            Username = Username,
                        };
                        sendToPartners(Json.Encode(request));
                        break;
                    }
                case "GetPage":
                    {
                        var pageID = jsonMessage.PageID;
                        var strDocument = File.ReadAllText(appData + "Documents\\" + pageID + ".json");
                        Document objDocument = Json.Decode<Document>(strDocument);
                        ActivePage = pageID;
                        var request = new
                        {
                            Type = "GetPage",
                            Document = objDocument,
                            SessionID = SessionID,
                        };
                        Send(Json.Encode(request));
                        break;
                    }
                case "RenameDocument":
                    {
                        var strDocument = File.ReadAllText(appData + "Documents\\" + jsonMessage.DocumentID + ".json");
                        var jsonDocument = Json.Decode<Document>(strDocument);
                        jsonDocument.DocumentName = (string)jsonMessage.NewName;
                        File.WriteAllText(appData + "Documents\\" + jsonMessage.DocumentID + ".json", Json.Encode(jsonDocument));
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        var index = jsonNotebook.Documents.FindIndex(de => de.DocumentID == jsonMessage.DocumentID);
                        jsonNotebook.Documents.RemoveAt(index);
                        jsonNotebook.Documents.Insert(index, new DocumentEntry(jsonMessage.DocumentID, jsonMessage.NewName));
                        sortDocuments(jsonNotebook);
                        File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                        var request = new
                        {
                            Type = "RenameDocument",
                            Document = jsonDocument,
                            SessionID = SessionID,
                            Username = Username,
                        };
                        sendToPartners(Json.Encode(request));
                        break;
                    }
                case "Typing":
                    {
                        var request = new
                        {
                            Type = "Typing",
                            DocumentID = jsonMessage.DocumentID,
                            SessionID = SessionID,
                            Username = Username,
                        };
                        var partnerSockets = SocketCollection.Where(sh => (sh as SocketHandler).NotebookID == NotebookID && ActivePage == jsonMessage.DocumentID && sh != this);
                        foreach (var socket in partnerSockets)
                        {
                            socket.Send(Json.Encode(request));
                        }
                        break;
                    }
                case "ContentUpdate":
                    {
                        var strDocument = File.ReadAllText(appData + "Documents\\" + jsonMessage.DocumentID + ".json");
                        Document jsonDocument = Json.Decode<Document>(strDocument);
                        jsonDocument.Contents = jsonMessage.Content;
                        File.WriteAllText(appData + "Documents\\" + jsonMessage.DocumentID + ".json", Json.Encode(jsonDocument));
                        var request = new
                        {
                            Type = "ContentUpdate",
                            DocumentID = jsonMessage.DocumentID,
                            Document = jsonDocument,
                            SessionID = SessionID,
                            Username = Username,
                        };
                        var partnerSockets = SocketCollection.Where(sh => (sh as SocketHandler).NotebookID == NotebookID && ActivePage == jsonMessage.DocumentID && sh != this);
                        foreach (var socket in partnerSockets)
                        {
                            socket.Send(Json.Encode(request));
                        }
                        break;
                    }
                case "SetSecurity":
                    {
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        if (jsonMessage.Step == "Initial")
                        {
                            if (jsonNotebook.IsPasswordSet)
                            {
                                var request = new
                                {
                                    Type = "SetSecurity",
                                    Status = "Locked",
                                };
                                Send(Json.Encode(request));
                            }
                            else
                            {
                                var request = new
                                {
                                    Type = "SetSecurity",
                                    Status = "ok",
                                    Email = jsonNotebook.Email ?? "",
                                    PIN = jsonNotebook.PIN ?? "",
                                };
                                Send(Json.Encode(request));
                            }
                        }
                        else if (jsonMessage.Step == "Unlock")
                        {
                            if (!Crypto.VerifyHashedPassword(jsonNotebook.Password, jsonMessage.Password))
                            {
                                var request = new
                                {
                                    Type = "SetSecurity",
                                    Status = "Failed",
                                };
                                Send(Json.Encode(request));
                            }
                            else
                            {
                                var request = new
                                {
                                    Type = "SetSecurity",
                                    Status = "ok",
                                    Email = jsonNotebook.Email ?? "",
                                    PIN = jsonNotebook.PIN ?? "",
                                };
                                Send(Json.Encode(request));
                                AdminVerified = true;
                            }
                        }
                        else if (jsonMessage.Step == "Set")
                        {
                            if (jsonNotebook.IsPasswordSet && AdminVerified != true)
                            {
                                return;
                            }
                            if (jsonMessage.Email != null)
                            {
                                foreach (var character in jsonMessage.Email)
                                {
                                    if (Path.GetInvalidFileNameChars().Contains((char)character))
                                    {
                                        return;
                                    }
                                }
                                jsonNotebook.Email = jsonMessage.Email;
                                var strExistingIDs = File.ReadAllText(appData + "Emails\\" + jsonMessage.Email + ".txt");
                                List<string> listIDs = Json.Decode<List<string>>(strExistingIDs);
                                if ((listIDs is List<string>) == false)
                                {
                                    listIDs = new List<string>();
                                }
                                listIDs.Add(NotebookID);
                                File.WriteAllText(appData + "Emails\\" + jsonMessage.Email + ".txt", Json.Encode(listIDs.Distinct()));
                            }
                            if (jsonMessage.PIN != null)
                            {
                                if (jsonMessage.PIN == "")
                                {
                                    jsonNotebook.PIN = null;
                                }
                                else
                                {
                                    jsonNotebook.PIN = Crypto.HashPassword(jsonMessage.PIN);
                                }
                               
                            }
                            File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                        }
                        break;
                    }
                case "SetAdmin":
                    {
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        if (jsonMessage.Step == "Initial")
                        {
                            if (jsonNotebook.IsPasswordSet)
                            {
                                var request = new
                                {
                                    Type = "SetAdmin",
                                    Step = "Locked"
                                };
                                Send(Json.Encode(request));
                            }
                            else
                            {
                                var request = new
                                {
                                    Type = "SetAdmin",
                                    Step = "Open"
                                };
                                Send(Json.Encode(request));
                            }
                        }
                        else if (jsonMessage.Step == "Unlock")
                        {
                            if (!Crypto.VerifyHashedPassword(jsonNotebook.Password, jsonMessage.Password))
                            {
                                var request = new
                                {
                                    Type = "SetAdmin",
                                    Step = "Failed"
                                };
                                Send(Json.Encode(request));
                            }
                            else
                            {
                                var request = new
                                {
                                    Type = "SetAdmin",
                                    UserPassword = jsonMessage.Password,
                                    Step = "Unlocked"
                                };
                                Send(Json.Encode(request));
                            }
                        }
                        else if (jsonMessage.Step == "Set")
                        {
                            if (jsonNotebook.IsPasswordSet)
                            {
                                if (!Crypto.VerifyHashedPassword(jsonNotebook.Password, jsonMessage.UserPassword))
                                {
                                    var request = new
                                    {
                                        Type = "SetAdmin",
                                        Step = "Failed"
                                    };
                                    Send(Json.Encode(request));
                                }
                                else
                                {
                                    jsonNotebook.Password = Crypto.HashPassword(jsonMessage.NewPassword);
                                    var request = new
                                    {
                                        Type = "SetAdmin",
                                        Step = "Success"
                                    };
                                    File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                                    Send(Json.Encode(request));
                                }
                            }
                            else
                            {
                                jsonNotebook.Password = Crypto.HashPassword(jsonMessage.NewPassword);
                                var request = new
                                {
                                    Type = "SetAdmin",
                                    Step = "Success"
                                };
                                File.WriteAllText(appData + "Notebooks\\" + NotebookID + ".json", Json.Encode(jsonNotebook));
                                Send(Json.Encode(request));
                            }
                        }
                        break;
                    }
                case "DeleteNotebook":
                    {
                        try
                        {
                            var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                            var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                            foreach (var document in jsonNotebook.Documents)
                            {
                                File.Delete(appData + "Documents\\" + document.DocumentID + ".json");
                            }
                            File.Delete(appData + "Notebooks\\" + NotebookID + ".json");
                            jsonMessage.Status = "success";
                        }
                        catch
                        {
                            jsonMessage.Status = "failed";
                        }
                        Send(Json.Encode(jsonMessage));
                        break;
                    }

                case "RefreshNotebook":
                    {
                        var strNotebook = File.ReadAllText(appData + "Notebooks\\" + NotebookID + ".json");
                        var jsonNotebook = Json.Decode<Notebook>(strNotebook);
                        var request = new
                        {
                            Type = "RefreshNotebook",
                            ChatMessages = jsonNotebook.ChatMessages,
                            Documents = jsonNotebook.Documents,
                        };
                        Send(Json.Encode(request));
                        break;
                    }
                default:
                    break;
            }
        }
        public override void OnClose()
        {
            SocketCollection.Remove(this);
            sendUsers();
        }
        public override void OnError()
        {
            SocketCollection.Remove(this);
            sendUsers();
        }
        private void sendUsers()
        {
            var sockets = SocketCollection.Where(sh => (sh as SocketHandler).NotebookID == NotebookID).ToList();
            var count = sockets.Count();
            var users = new List<string>();
            for (int i = 0; i < sockets.Count(); i++)
            {
                users.Add((sockets[i] as SocketHandler).Username);
            }
            var request = new
            {
                Type = "CurrentUsers",
                Number = count,
                Users = users,
            };
            sendToPartners(Json.Encode(request));
        }
        private void sendToPartners(string message)
        {
            var partnerSockets = SocketCollection.Where(sh => (sh as SocketHandler).NotebookID == NotebookID);
            foreach (var socket in partnerSockets)
            {
                socket.Send(message);
            }
        }
        private void sortDocuments(Notebook jsonNotebook)
        {
            jsonNotebook.Documents.Sort(new Comparison<DocumentEntry>((doc1, doc2) => {
                var value1 = doc1.DocumentName;
                var value2 = doc2.DocumentName;
                if (value1.Contains("[") && value1.Contains("]") && value1.IndexOf("[") > value1.IndexOf("]"))
                {
                    value1 = value1.Substring(value1.IndexOf("[") + 1, value1.IndexOf("]"));
                }
                if (value2.Contains("[") && value2.Contains("]") && value2.IndexOf("[") > value2.IndexOf("]"))
                {
                    value2 = value2.Substring(value2.IndexOf("[") + 1, value2.IndexOf("]"));
                }
                return value2.Trim().CompareTo(value1.Trim());
            }));
        }
        public string SessionID { get; set; }
        public string Username { get; set; }
        public string NotebookID { get; set; }
        public string ActivePage { get; set; }
        public bool AdminVerified { get; set; }
    }
}
