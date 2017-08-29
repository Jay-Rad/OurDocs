var OurDocs = OurDocs || {};
OurDocs.WebSocket = {
    get Socket() {
        if (OurDocs.WebSocket.socket == undefined)
        {
            if (window.location.hostname == "localhost") {
                OurDocs.WebSocket.socket = new WebSocket("ws://" + location.host + location.pathname + "Pages/Notebook.cshtml");
            } else {
                OurDocs.WebSocket.socket = new WebSocket("wss://" + location.host + location.pathname + "Pages/Notebook.cshtml");
            }
            OurDocs.WebSocket.SetHandlers();
        }
        return OurDocs.WebSocket.socket;
    },
    set Socket(value) {
        OurDocs.WebSocket.socket = value;
    },
    socket: undefined,
    SetHandlers: function () {
        OurDocs.WebSocket.Socket.onopen = function () {
            console.log("Connected.");
            if (OurDocs.NotebookID != undefined) {
                var request = {
                    "Type": "NotebookID",
                    "NotebookID": OurDocs.NotebookID
                };
                OurDocs.WebSocket.Socket.send(JSON.stringify(request));
                resumeState();
            }
        };
        OurDocs.WebSocket.Socket.onerror = function (e) {
            console.log("Error.");
            var divError = document.createElement("div");
            var divMessage = document.createElement("div");
            var buttonRefresh = document.createElement("button");
            divMessage.innerHTML = "Your connection has been lost.<br/><br/>Click Refresh to reconnect.<br/><br/>";
            buttonRefresh.innerHTML = "Refresh";
            buttonRefresh.type = "button";
            buttonRefresh.removeAttribute("style");
            buttonRefresh.style = "float: right";
            buttonRefresh.onclick = function () { window.location.reload(true) };
            $(divError).css({
                "position": "absolute",
                "font-weight": "bold",
                "background-color": "lightgray",
                "color": "red",
                "border-radius": "10px",
                "padding": "10px",
                "border": "2px solid dimgray",
                "top": "40%",
                "left": "50%",
                "transform": "translateX(-50%)",
                "z-index": "3",
            });
            divError.appendChild(divMessage);
            divError.appendChild(buttonRefresh);
            $(document.body).append(divError);
        };
        OurDocs.WebSocket.Socket.onclose = function () {
            console.log("Closed.");
        };
        OurDocs.WebSocket.Socket.onmessage = function (e) {
            var strMessage = e.data;
            var jsonMessage = JSON.parse(strMessage);
            switch (jsonMessage.Type) {
                case "SessionID":
                    {
                        OurDocs.SessionID = jsonMessage.SessionID;
                        break;
                    }
                case "CurrentUsers":
                    {
                        $("#spanUsers").text(jsonMessage.Number);
                        $("#divUserList").html("");
                        for (var i = 0; i < jsonMessage.Users.length; i++) {
                            $("#divUserList").append(jsonMessage.Users[i]);
                            if (i != jsonMessage.Users.length - 1)
                            {
                                $("#divUserList").append("<hr>");
                            }
                        };
                        break;
                    }
                case "Chat":
                    {
                        addChatMessage(jsonMessage);
                        if ($("#divChatMessageFrame").is(":hidden"))
                        {
                            $("#divChatHeader").children().text("Chat (!)")
                            if (sessionStorage["blinkInterval"])
                            {
                                window.clearInterval(sessionStorage["blinkInterval"]);
                            }
                            sessionStorage["blinkInterval"] = window.setInterval(function () {
                                if ($("#divChatMessageFrame").is(":hidden")) {
                                    $("#divChatHeader").toggleClass("hover");
                                }
                                else
                                {
                                    window.clearInterval(sessionStorage["blinkInterval"]);
                                    $("#divChatHeader").removeClass("hover");
                                    $("#divChatHeader").children().text("Chat")
                                }
                            }, 1000);
                        }
                        break;
                    }
                case "AddDocument":
                    {
                        var newPage = jsonMessage.Document;
                        addPageOption(newPage.DocumentName, newPage.DocumentID);
                        if (jsonMessage.SessionID == OurDocs.SessionID) {
                            selectDocument(newPage.DocumentID);
                            if (jsonMessage.SessionID == OurDocs.SessionID)
                            {
                                renameDocument();
                            }
                        }
                        else {
                            showTooltip($("#svgMainMenu"), "right", "green", "Document added by: " + jsonMessage.Username);
                        }
                        break;
                    }
                case "DeleteDocument":
                    {
                        $("#" + jsonMessage.DocumentID).remove();
                        if (jsonMessage.SessionID == OurDocs.SessionID) {
                            OurDocs.Editor.setContent("");
                            localStorage.removeItem("OurDocsLastDocument");
                        }
                        else {
                            showTooltip($("#svgMainMenu"), "right", "red", "Document removed by: " + jsonMessage.Username);
                        }
                        break;
                    }
                case "GetPage":
                    {
                        var page = jsonMessage.Document;
                        if (!page) {
                            return;
                        }
                        tinymce.get("textContent").setContent(atob(page.Contents || ""));
                        break;
                    }
                case "RenameDocument":
                    {
                        var newDocument = jsonMessage.Document;
                        var strDocumentName = newDocument.DocumentName;
                        if (strDocumentName.includes("[") && strDocumentName.includes("]") && strDocumentName.indexOf("[") < strDocumentName.indexOf("]")) {
                            $("#" + newDocument.DocumentID).attr("sortby", strDocumentName.slice(strDocumentName.indexOf("[") + 1, strDocumentName.indexOf("]")));
                            strDocumentName = (strDocumentName.slice(0, strDocumentName.indexOf("[")) + strDocumentName.slice(strDocumentName.indexOf("]") + 1)).trim();
                        }
                        $("#" + newDocument.DocumentID).children().first().text(strDocumentName);
                        $("#" + newDocument.DocumentID).children().first().attr("title", strDocumentName);
                        if (jsonMessage.SessionID != OurDocs.SessionID) {
                            showTooltip($("#svgMainMenu"), "right", "green", "Document renamed by: " + jsonMessage.Username);
                        }
                        sortDocuments();
                        break;
                    }
                case "Typing":
                    if ($(".page-tab.active").attr("id") == jsonMessage.DocumentID) {
                        showTooltip(OurDocs.Editor.getContentAreaContainer(), "center", "green", "Document being edited by: " + jsonMessage.Username);
                        if ($(OurDocs.Editor.contentDocument).find("#tinymce").is(":focus")) {
                            $(OurDocs.Editor.contentDocument).find("#tinymce").blur();
                        }
                    }
                    else {
                        showTooltip($("#svgMainMenu"), "right", "green", "Document \"" + jsonMessage.Document.DocumentName + "\" modified by: " + jsonMessage.Username);
                    };
                    break;
                case "ContentUpdate":
                    {
                        if ($(".page-tab.active").attr("id") == jsonMessage.DocumentID) {
                            showTooltip(OurDocs.Editor.getContentAreaContainer(), "center", "green", "Document being edited by: " + jsonMessage.Username);
                            if ($(OurDocs.Editor.contentDocument).find("#tinymce").is(":focus")) {
                                $(OurDocs.Editor.contentDocument).find("#tinymce").blur();
                            }
                            OurDocs.Editor.setContent(atob(jsonMessage.Document.Contents));
                        }
                        else {
                            showTooltip($("#svgMainMenu"), "right", "green", "Document \"" + jsonMessage.Document.DocumentName + "\" modified by: " + jsonMessage.Username);
                        };
                        break;
                    }
                case "SetSecurity":
                    {
                        if (jsonMessage.Status == "ok") {
                            $("#inputEmail").val(jsonMessage.Email);
                            $("#inputPIN").val(jsonMessage.PIN);
                            $("#divSecurity").slideToggle();
                        }
                        else if (jsonMessage.Status == "Locked") {
                            var result = prompt("Enter the admin password.");
                            if (result != null) {
                                OurDocs.WebSocket.Socket.send('{ "Type": "SetSecurity", "Step": "Unlock", "Password": "' + result + '" }');
                            }
                        }
                        else if (jsonMessage.Status == "Failed") {
                            showTooltip($("#buttonSetSecurity"), "right", "red", "Incorrect password.");
                        }
                        break;
                    }
                case "SetAdmin":
                    {
                        if (jsonMessage.Step == "Locked") {
                            var result = prompt("Security features are locked by an admin password.\r\n\r\nEnter the admin password.");
                            if (result != null) {
                                OurDocs.WebSocket.Socket.send('{ "Type": "SetAdmin", "Step": "Unlock", "Password": "' + result + '"}');
                            }
                        }
                        else if (jsonMessage.Step == "Open") {
                            // TODO: Change to secure input.
                            var result = prompt("Enter a new admin password.");
                            if (result != null) {
                                OurDocs.WebSocket.Socket.send('{ "Type": "SetAdmin", "Step": "Set", "NewPassword": "' + result + '"}');
                            }
                        }
                        else if (jsonMessage.Step == "Unlocked") {
                            // TODO: Change to secure input.
                            var result = prompt("Unlocked.  Enter a new admin password.");
                            if (result != null) {
                                OurDocs.WebSocket.Socket.send('{ "Type": "SetAdmin", "Step": "Set", "UserPassword": "' + jsonMessage.UserPassword + '", "NewPassword": "' + result + '"}');
                            }
                        }
                        else if (jsonMessage.Step == "Failed") {
                            showTooltip($("#imgAdminLock"), "right", "red", "Password incorrect.");
                        }
                        else if (jsonMessage.Step == "Success") {
                            showTooltip($("#imgAdminLock"), "right", "green", "Password set.");
                        }
                        break;
                    }
                case "RefreshNotebook":
                    {
                        if (jsonMessage.Documents)
                        {
                            $(".page-tab:not(#divAddDocument)").remove();
                            jsonMessage.Documents.forEach(function (value) {
                                addPageOption(value.Value, value.Key);
                            });
                            if (localStorage["OurDocsLastDocument"] && localStorage["OurDocsLastDocument"].split(",")[1])
                            {
                                selectDocument(localStorage["OurDocsLastDocument"].split(",")[1]);
                            }
                        }
                        if (jsonMessage.ChatMessages) {
                            $("#divChatMessages").html();
                            jsonMessage.ChatMessages.forEach(function (value) {
                                var message = JSON.parse(atob(value));
                                addChatMessage(message);
                            });
                        }
                        break;
                    }
                case "DeleteNotebook":
                    {
                        if (jsonMessage.Status == "success") {
                            location.href = location.origin + location.pathname;
                        }
                        else if (jsonMessage.Status == "failed") {
                            showTooltip($("#buttonDeleteNotepad"), "right", "red", "Failed to delete.  One or more files may be in use.  Try again later.");
                        }
                    }
                default:
                    break;
            }
        };
    }
};