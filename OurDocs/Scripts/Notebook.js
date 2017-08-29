var Temp = Temp || {};

function copyLink() {
    $("#inputLink").select();
    try {
        var result = document.execCommand("copy");
    }
    catch (ex) {
        showTooltip($("#inputLink"), "bottom", "red", "Failed to copy to clipboard.");
    };
    if (result) {
        showTooltip($("#inputLink"), "bottom", "seagreen", "Link copied to clipboard.");
    }
    else {
        showTooltip($("#inputLink"), "bottom", "red", "Failed to copy to clipboard.");
    };
};
function showTooltip(objPlacementTarget, strPlacementDirection, strColor, strMessage) {
    if (objPlacementTarget instanceof jQuery) {
        objPlacementTarget = objPlacementTarget[0];
    }
    var divTooltip = document.createElement("div");
    divTooltip.innerText = strMessage;
    divTooltip.classList.add("tooltip");
    divTooltip.style.zIndex = 3;
    divTooltip.id = "tooltip" + String(Math.random());
    $(divTooltip).css({
        "position": "absolute",
        "background-color": "whitesmoke",
        "color": strColor,
        "border-radius": "10px",
        "padding": "5px",
        "border": "1px solid dimgray",
        "font-size": ".8em"
    });
    var rectPlacement = objPlacementTarget.getBoundingClientRect();
    switch (strPlacementDirection) {
        case "top":
            {
                divTooltip.style.top = Number(rectPlacement.top - 5) + "px";
                divTooltip.style.transform = "translateY(-100%)";
                divTooltip.style.left = rectPlacement.left + "px";
                break;
            }
        case "right":
            {
                divTooltip.style.top = rectPlacement.top + "px";
                divTooltip.style.left = Number(rectPlacement.right + 5) + "px";
                break;
            }
        case "bottom":
            {
                divTooltip.style.top = Number(rectPlacement.bottom + 5) + "px";
                divTooltip.style.left = rectPlacement.left + "px";
                break;
            }
        case "left":
            {
                divTooltip.style.top = rectPlacement.top + "px";
                divTooltip.style.left = Number(rectPlacement.left - 5) + "px";
                divTooltip.style.transform = "translateX(-100%)";
                break;
            }
        case "center":
            {
                divTooltip.style.top = Number(rectPlacement.bottom - (rectPlacement.height / 2)) + "px";
                divTooltip.style.left = Number(rectPlacement.right - (rectPlacement.width / 2)) + "px";
                divTooltip.style.transform = "translate(-50%, -50%)";
                break;
            }
        default:
            break;
    }
    $(document.body).append(divTooltip);
    window.setTimeout(function () {
        $(divTooltip).animate({ opacity: 0 }, 1000, function () {
            $(divTooltip).remove();
        })
    }, strMessage.length * 50);
}
function toggleMenu() {
    if ($("#divMainMenu").css("display") == "none") {
        $("#divMainMenu").css("display", "block");
        var width = Math.min(225, Math.round(document.documentElement.clientWidth * .8));
        $("#divMainMenu").animate({
            "width": width + "px",
        }, 250);
    } else {
        $("#divMainMenu").animate({
            "width": 0,
        }, 250, function () {
            $("#divMainMenu").css("display", "none");
        });
    };
};
function setUsername() {
    localStorage["OurDocsUsername"] = $("#inputUsername").val();
    showTooltip($("#buttonSetUsername"), "bottom", "green", "Username set.");
    OurDocs.WebSocket.Socket.send('{ "Type": "SetUsername", "Username": "' + $("#inputUsername").val() + '" }');
};
function addDocument() {
    OurDocs.WebSocket.Socket.send('{ "Type": "AddDocument" }');
    toggleMenu();
};
function deleteDocument() {
    if ($(".page-tab.active").attr("id") == "") {
        return;
    };
    var result = confirm("Are you sure you want to delete this document?");
    if (result == true) {
        OurDocs.WebSocket.Socket.send('{ "Type": "DeleteDocument", "DocumentID": "' + $(".page-tab.active").attr("id") + '" }');
    }
}
function renameDocument() {
    if ($(".page-tab.active").attr("id") == "") {
        return;
    };
    
    var result = prompt("Enter a new document name.\r\n\r\nHint: Values placed inside [ ] brackets will be used exclusively for sorting but won't be displayed.", $(".page-tab.active").children().first().text());
    if (result == null) {
        return;
    };
    OurDocs.WebSocket.Socket.send('{ "Type": "RenameDocument", "DocumentID": "' + $(".page-tab.active").attr("id") + '", "NewName": "' + result + '" }');
}
function addPageOption(strDocumentName, strDocumentID) {
    var newTab = document.createElement("div");
    newTab.id = strDocumentID;
    newTab.classList.add("page-tab");
    newTab.onclick = function () {
        selectDocument(strDocumentID);
    };
    var newLabel = document.createElement("label");
    newLabel.classList.add("page-tab-label");
    if (strDocumentName.includes("[") && strDocumentName.includes("]") && strDocumentName.indexOf("[") < strDocumentName.indexOf("]")) {
        newTab.setAttribute("sortby", strDocumentName.slice(strDocumentName.indexOf("[") + 1, strDocumentName.indexOf("]")));
        strDocumentName = (strDocumentName.slice(0, strDocumentName.indexOf("[")) + strDocumentName.slice(strDocumentName.indexOf("]") + 1)).trim();
    }
    newLabel.innerHTML = strDocumentName;
    newLabel.title = strDocumentName;
    newTab.appendChild(newLabel);
    $("#divDocuments").prepend(newTab);
    sortDocuments();
};
function sortDocuments() {
    var pages = $(".page-tab:not(#divAddDocument)");
    $(pages).remove();
    pages.sort(function (page1, page2) {
        return (page1.getAttribute("sortby") || page1.children[0].innerText).trim().toLowerCase() > (page2.getAttribute("sortby") || page2.children[0].innerText).trim().toLowerCase();
    });
    $("#divDocuments").prepend(pages);
};
function selectDocument(strDocumentID) {
    $(".page-tab.active").removeClass("active");
    $("#" + strDocumentID).addClass("active");
    if ($("#divMainMenu").is(":visible")) {
        toggleMenu();
    };
    localStorage["OurDocsLastDocument"] = OurDocs.NotebookID + "," + strDocumentID;
    OurDocs.WebSocket.Socket.send('{ "Type": "GetPage", "PageID": "' + strDocumentID + '" }');
}
function goFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    }
    else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
    else if (document.documentElement.webkitRequestFullScreen) {
        document.documentElement.webkitRequestFullScreen();
    }
    else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    }
    else {
        showTooltip($("#buttonFullscreen"), "bottom", "red", "Fullscreen not supported by your browser.");
    }
}
function resumeState() {
    if (localStorage["OurDocsUsername"] != undefined) {
        $("#inputUsername").val(localStorage["OurDocsUsername"]);
        OurDocs.WebSocket.Socket.send('{ "Type": "SetUsername", "Username": "' + $("#inputUsername").val() + '" }');
    }
    if (localStorage["OurDocsLastDocument"] != undefined) {
        var arrNoteDoc = localStorage["OurDocsLastDocument"].split(",");
        if (arrNoteDoc[0] == OurDocs.NotebookID && $("#" + arrNoteDoc[1]).length > 0)
        {
            selectDocument(arrNoteDoc[1]);
        }
    }
}

function setSecurity() {
    if ($("#divSecurity").is(":visible"))
    {
        $("#divSecurity").slideToggle();
    }
    else
    {
        OurDocs.WebSocket.Socket.send('{ "Type": "SetSecurity", "Step": "Initial" }');
    }
}
function setPIN() {
    OurDocs.WebSocket.Socket.send('{ "Type": "SetSecurity", "Step": "Set", "PIN": "' + $("#inputPIN").val() + '" }');
    showTooltip($("#buttonSetPIN"), "bottom", "green", "PIN set.");
}
function adminLock() {
    OurDocs.WebSocket.Socket.send('{ "Type": "SetAdmin", "Step": "Initial" }');
}
function setEmail() {
    OurDocs.WebSocket.Socket.send('{ "Type": "SetSecurity", "Step": "Set", "Email": "' + $("#inputEmail").val() + '" }');
    $("#divEmailWarning").remove();
    showTooltip($("#buttonSetEmail"), "bottom", "green", "Email set.");
}
function exportDocument() {
    var docID = $(".page-tab.active").attr("id");
    if (docID == "")
    {
        return;
    }
    var docName = $("#" + docID).text();
    var blob = new Blob([OurDocs.Editor.getContent()], { type: "text/html" });
    var file;
    try {
        file = new File([blob], docID + ".html")
    }
    catch (ex) {
        file = blob;
    }
    var url = window.URL.createObjectURL(file);
    var link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.setAttribute("download", docName + ".html");
    link.type = "text/html";
    document.body.appendChild(link);
    link.click();
    $(link).remove();
}
function deleteNotebook() {
    if (confirm("Are you sure you want to delete this notebook?")) {
        OurDocs.WebSocket.Socket.send('{ "Type": "DeleteNotebook" }');
    }
}
function resizeChatMouse (e) {
    e.preventDefault();
   
    Temp.Dragging = true;
    Temp.StartPoint = e;
    Temp.MessageFrame = $("#divChatMessageFrame");
    Temp.StartHeight = Temp.MessageFrame.height();

    window.onmousemove = function (e) {
        e.preventDefault();
        $("#divChatMessageFrame").css("display", "block");
        if (Temp.Dragging) {
            $("#inputChat").blur();
            var newHeight = Temp.StartHeight - (e.clientY - Temp.StartPoint.clientY);
            if (newHeight > document.documentElement.clientHeight * .9) {
                Temp.MessageFrame.css("z-index", 2);
                Temp.MessageFrame.height(document.documentElement.clientHeight * .9);
            }
            else if (newHeight > 0) {
                Temp.MessageFrame.css("z-index", 2);
                Temp.MessageFrame.height(newHeight);
            }
            else if (newHeight <= 0) {
                Temp.MessageFrame.css("z-index", 0);
                Temp.MessageFrame.height(0);
                $("#divChatMessageFrame").css("display", "none");
            }
        }
    };
    window.onmouseleave = function (e) {
        Temp.Dragging = false;
        $(window).off("mousemove mouseleave mouseup");
        $("#divChatMessages")[0].scrollTop = $("#divChatMessages")[0].scrollHeight;
    };
    window.onmouseup = function (e) {
        var totalXDistance = Math.abs(e.clientX - Temp.StartPoint.clientX);
        var totalYDistance = Math.abs(e.clientY - Temp.StartPoint.clientY);
        if (totalXDistance < 5 && totalYDistance < 5) {
            if (Temp.MessageFrame.height() > 0) {
                Temp.MessageFrame.css("z-index", 0);
                Temp.MessageFrame.animate({ "height": "0" }, 750, function () {
                    $("#divChatMessageFrame").css("display", "none");
                });
            } else {
                Temp.MessageFrame.css("z-index", 2);
                Temp.MessageFrame.animate({ "height": "50vh" }, 750);
                $("#divChatMessageFrame").css("display", "block");
                $("#inputChat").blur();
            }
        }
        $("#divChatMessages")[0].scrollTop = $("#divChatMessages")[0].scrollHeight;
        Temp.Dragging = false;
        window.onmousemove = null;
        window.onmouseleave = null;
        window.onmouseup = null;
    };
};

function resizeChatTouch (e) {
    e.preventDefault();
    if (e.touches.length == 1) {
        $("#divChatHeader").addClass("hover");
        Temp.Dragging = true;
        Temp.StartPoint = e.touches[0];
        Temp.MessageFrame = $("#divChatMessageFrame");
        Temp.StartHeight = Temp.MessageFrame.height();
        Temp.LastTouch = e.touches[0];
        window.ontouchmove = function (e) {
            e.preventDefault();
            $("#divChatMessageFrame").css("display", "block");
            if (Temp.Dragging && e.touches.length == 1) {
                $("#inputChat").blur();
                Temp.LastTouch = e.touches[0];
                var newHeight = Temp.StartHeight - (e.touches[0].clientY - Temp.StartPoint.clientY);
                if (newHeight > document.documentElement.clientHeight * .9) {
                    Temp.MessageFrame.css("z-index", 2);
                    Temp.MessageFrame.height(document.documentElement.clientHeight * .9);
                }
                else if (newHeight > 0) {
                    Temp.MessageFrame.css("z-index", 2);
                    Temp.MessageFrame.height(newHeight);
                }
                else if (newHeight <= 0) {
                    Temp.MessageFrame.css("z-index", 0);
                    Temp.MessageFrame.height(0);
                    $("#divChatMessageFrame").css("display", "none");
                }
            }
        };
        window.ontouchend = function (e) {
            $("#divChatHeader").removeClass("hover");
            var totalXDistance = Math.abs(Temp.LastTouch.clientX - Temp.StartPoint.clientX);
            var totalYDistance = Math.abs(Temp.LastTouch.clientY - Temp.StartPoint.clientY);
            if (totalXDistance < 5 && totalYDistance < 5) {
                if (Temp.MessageFrame.height() > 0) {
                    Temp.MessageFrame.css("z-index", 0);
                    Temp.MessageFrame.animate({ "height": "0" }, 750, function () {
                        $("#divChatMessageFrame").css("display", "none");
                    });
                } else {
                    Temp.MessageFrame.css("z-index", 2);
                    Temp.MessageFrame.animate({ "height": "50vh" }, 750);
                    $("#divChatMessageFrame").css("display", "block");
                    $("#inputChat").blur();
                }
            }
            $("#divChatMessages")[0].scrollTop = $("#divChatMessages")[0].scrollHeight;
            Temp.Dragging = false;
            window.ontouchmove = null;
            window.ontouchend = null;
        };
    }
};

function toggleChat() {
    $("#divChatMessageFrame").slideToggle();
}
function chatSubmit() {

    OurDocs.WebSocket.Socket.send('{ "Type": "Chat", "Username": "' + ($("#inputUsername").val() || "Unnamed User") + '", "Message": "' + btoa($("#inputChat").val()) + '" }');
    $("#inputChat").val("");
}

function refreshNotebook() {
    OurDocs.WebSocket.Socket.send('{ "Type": "RefreshNotebook" }');
}
function addChatMessage(message) {
    var decodedMessage = atob(message.Message);
    var divMessage = document.createElement("div");
    divMessage.style.marginBottom = "5px";
    divMessage.innerHTML = '<strong>' + message.Username + '</strong>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:gray; font-size:.8em">' + message.DateTime + '</span><br>' + decodedMessage;
    $("#divChatMessages").append(divMessage);
    $("#divChatMessages")[0].scrollTop = $("#divChatMessages")[0].scrollHeight;
}
function showError (errorMessage) {
    var divError = document.createElement("div");
    divError.innerText = errorMessage;
    $(divError).css({
        "position": "absolute",
        "background-color": "lightgray",
        "color": "red",
        "border-radius": "10px",
        "padding": "10px",
        "border": "1px solid dimgray",
        "top": "40%",
        "left": "50%",
        "transform": "translateX(-50%)",
        "z-index": "2",
    });
    $(document.body).append(divError);
}

function sendContent() {
    if ($(".page-tab.active").length > 0) {
        OurDocs.WebSocket.Socket.send('{ "Type": "Typing", "DocumentID": "' + $(".page-tab.active").attr("id") + '" }');
        Temp.LastInput = new Date();
        if (Temp.Timeout) {
            window.clearTimeout(Temp.Timeout);
        }
        Temp.Timeout = window.setTimeout(function () {
            var content = btoa(OurDocs.Editor.getContent());
            OurDocs.WebSocket.Socket.send('{ "Type": "ContentUpdate", "DocumentID": "' + $(".page-tab.active").attr("id") + '", "Content": "' + content + '" }');
        }, 2500);
    }
};