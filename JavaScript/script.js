var exportingSequence = false;
let checkAll = false;

var color_picker = document.getElementById("tagColor");
var color_picker_wrapper = document.getElementById("color_picker_wrapper");
color_picker.onchange = function () {
  color_picker_wrapper.style.backgroundColor = color_picker.value;
  localStorage.setItem("colorPickerVale", color_picker.value);
  $(".tagStyle").css("background-color", color_picker.value);
};
color_picker_wrapper.style.backgroundColor = color_picker.value;

$(document).on("click", "#resetColor", function () {
  color_picker_wrapper.style.backgroundColor = "#cbdee8";
  localStorage.setItem("colorPickerVale", "#cbdee8");
  $(".tagStyle").css("background-color", "#cbdee8");
});

function tagTest(groupCaughtID) {
  const cardTextEls = document.getElementsByClassName("cardText");
  Array.from(cardTextEls).forEach(function (cardTextEl) {
    if (cardTextEl.classList.contains(groupCaughtID)) {
      if (
        $(cardTextEl)
          .siblings(".tagContainer")[0]
          .querySelector(`p[id="${groupCaughtID}"]`)
      ) {
      } else {
        let cardGroup = document.querySelector(`li[id="${groupCaughtID}"]`);
        if (cardGroup) {
          cardGroup = cardGroup.textContent;
          $(cardTextEl)
            .siblings(".tagContainer")[0]
            .insertAdjacentHTML(
              "beforeend",
              `<p id="${groupCaughtID}" class="tagStyle">${cardGroup}
      <i title="Remove from group" class="fa-solid fa-xmark" ></i>
      </p></div>`
            );
        }
      }
    }
  });
  $(".tagStyle").css("background-color", color_picker.value);
}

$(document).on("click", ".fa-xmark", function (e) {
  let remover = e.target.parentNode.id;
  let removee1 = e.target.parentNode.parentNode;
  let removee = $(removee1).siblings(".cardText");
  $(removee).removeClass(remover);
  e.target.parentNode.remove();
  let groupItems = $(".listItem");
  Array.from(groupItems).forEach(function (groupItem) {
    if (groupItem.style.backgroundColor == "rgb(240, 240, 240)") {
      $(groupItem).click();
    }
  });
});

let keypres = false;
let texter = `<div contenteditable='false' class="ui-card-container" style='cursor:pointer; outline:none'>
<i title="Format & Edit" class="clickeredit fa-solid fa-marker iconstyle"></i><br>
<i title="Copy" class='clickercopy fas fa-copy iconstyle'></i><br>
<i title="Delete" class="clickertrash fa-solid fa-trash iconstyle"></i>
</div>`;

let texter2 = `<div contenteditable='false' class="ui-bookmark-container" style='cursor:pointer; outline:none'>

<i title="Delete" class="clickertrashbookmark fa-solid fa-trash iconstyle"></i>
</div>`;

function checkTut() {
  if (localStorage.getItem("tut")) {
  } else {
    runTutorial();
    localStorage.setItem("tut", "true");
  }
}

function checkLegacy() {
  const cardTextEls = document.getElementsByClassName("cardText");
  Array.from(cardTextEls).forEach(function (cardTextEl) {
    if (cardTextEl.parentNode == $("#cards")[0]) {
      cardTextEl.style.display = "block";
      $("#line").remove();
      var parent = cardTextEl.parentNode;
      var wrapper = document.createElement("div");
      wrapper.classList += "cardTextContainer";
      parent.replaceChild(wrapper, cardTextEl);
      wrapper.appendChild(cardTextEl);
      cardTextEl.insertAdjacentHTML(
        "afterend",
        `<div class="tagContainer" style="display: block;"></div>`
      );
      cardTextEl.insertAdjacentHTML("beforeend", texter);
      $(".cardTextContainer").css("font-family", chosenFont);
      $(".cardText").css("font-family", chosenFont);
      if (cardTextEl.id != "all") {
        let bookID = cardTextEl.id;
        cardTextEl.classList.add(bookID);
        tagTest(bookID);
        cardTextEl.id = "all";
      }

      callDrag();
      setOnLocal();
    }
  });
}

document.addEventListener("keydown", function () {
  if (keypres == true) {
    document.getElementById("shim3").style.opacity = "0";

    document.getElementById("welcometocollage").style.opacity = "0";
    document.getElementById("subtext").style.opacity = "0";
    document.getElementById("subtext2").style.opacity = "0";
    document.getElementById("subtext3").style.opacity = "0";

    setTimeout(() => {
      document.getElementById("shim3").style.display = "none";
      document.getElementById("welcometocollage").style.display = "none";
      document.getElementById("subtext").style.display = "none";
      document.getElementById("subtext2").style.display = "none";
      document.getElementById("subtext3").style.display = "none";
    }, 3000);
  }
});

function runTutorial() {
  document.getElementById("shim3").style.display = "block";
  document.getElementById("welcometocollage").style.display = "block";
  document.getElementById("subtext").style.display = "block";
  document.getElementById("subtext2").style.display = "block";
  document.getElementById("subtext3").style.display = "block";

  document.getElementById("welcometocollage").style.display = "block";
  setTimeout(() => {
    document.getElementById("shim3").style.opacity = ".85";
    setTimeout(() => {
      document.getElementById("welcometocollage").style.opacity = "1";
      setTimeout(() => {
        document.getElementById("subtext").style.opacity = "1";
        setTimeout(() => {
          document.getElementById("subtext2").style.opacity = "1";
          setTimeout(() => {
            document.getElementById("subtext3").style.opacity = "1";

            keypres = true;
          }, 7000);
        }, 3000);
      }, 2000);
    }, 1000);
  }, 200);
}

$(window).bind("storage", function (e) {});
var chosenFont;
$(".cardTextContainer").draggable({
  opacity: 0.5,
  revert: true,
});

$(window).bind("storage", function (e) {
  if (e.key === "update") {
    if (chosenFont) {
      createNew();
    } else {
      chosenFont = "Poppins";
      createNew();
    }
  }
});

const splitName = (name = "") => {
  const [firstName, ...lastName] = name.split(" ").filter(Boolean);
  return lastName.join(" ");
};

function countWords(s) {
  s = s.replace(/(^\s*)|(\s*$)/gi, ""); //exclude  start and end white-space
  s = s.replace(/[ ]{2,}/gi, " "); //2 or more space to 1
  return s.split(" ").filter(function (str) {
    return str != "";
  }).length;
}

function createNew() {
  // Creates all elements for the new card //
  let cardTextContainer = document.createElement("div");
  let tagContainer = document.createElement("div");
  let cardText = document.createElement("div");
  let lineOne = document.createElement("p");
  let lineTwo = document.createElement("p");
  let lineThreeMark = document.createElement("p");
  let lineBreak = document.createElement("br");
  let lineBreak2 = document.createElement("br");

  // Creates all variables from information from form for the new card //

  let myName = localStorage.getItem("author").trim();
  let myAge = localStorage.getItem("year").trim();
  let myTag = localStorage.getItem("tagline").trim();
  let myQual = localStorage.getItem("qualifications").trim();
  let myCard;
  if (localStorage.getItem("card")) {
    myCard = localStorage.getItem("card");
  } else {
    myCard = "ERROR: No card text inputted";
  }

  if (localStorage.getItem("tagline")) {
    myTag = localStorage.getItem("tagline").trim();
  } else {
    myTag = "ERROR: No tagline line inputted";
  }

  let myURL = localStorage.getItem("url").trim();
  let myPub = localStorage.getItem("publication").trim();

  // Sets CSS of the text to format the card //

  lineOne.style.cssText = `font-weight:bold; font-size:${tagSizeFinal}; margin:0; padding:0`;
  lineTwo.style.cssText = `font-size:${citeSizeFinal}; margin:0; padding:0`;
  lineThreeMark.style.cssText = `font-size:${normSizeFinal}; margin:0; padding:0`;

  // Adds the highlight to the card //

  lineBreak2.setAttribute("id", "line");
  lineOne.setAttribute("id", myURL);
  lineOne.textContent = myTag;

  lineOne.setAttribute("class", "fontS");
  lineOne.setAttribute("class", "urlFind");
  lineTwo.setAttribute("class", "fontS");
  lineThreeMark.setAttribute("class", "fontS");

  let textContentString = [];

  if (!myName && !myAge && !myQual && !myPub && !myURL) {
    textContentString.push("No cite info");
  }

  if (myName) {
    textContentString.push(myName);
  }

  if (myQual) {
    textContentString.push('"' + myQual + '"');
  }

  if (myAge) {
    textContentString.push(myAge);
  }

  if (myPub) {
    textContentString.push(myPub);
  }

  if (myURL) {
    textContentString.push(myURL);
  }

  if (localStorage.getItem("dateAccessed") == "true") {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();
    today = mm + "/" + dd + "/" + yyyy;
    if (localStorage.getItem("useLongDate") == "true") {
      textContentString.push(
        "Accessed " + moment(today, "MM/DD/YYYY").format("MMMM DD, YYYY")
      );
    } else {
      textContentString.push("Accessed " + today);
    }
  }

  if (localStorage.getItem("shortTagGen") == "true") {
    if (localStorage.getItem("useBracketsF") == "true") {
      lineTwo.textContent = "[" + textContentString.join(", ") + "]";
    } else {
      lineTwo.textContent = textContentString.join(", ");
    }
    if (
      localStorage.getItem("initials") &&
      document.getElementById("initialsCheck").checked
    ) {
      lineTwo.textContent += " " + localStorage.getItem("initials");
    }
    let lastName;
    let lastYear;

    if (localStorage.getItem("author")) {
      if (countWords(localStorage.getItem("author")) > 1) {
        lastName = splitName(localStorage.getItem("author").trim());
        lastName = lastName.split(/,| and/)[0];
      } else {
        lastName = localStorage.getItem("author").trim();
      }
    }
    if (localStorage.getItem("year")) {
      let lastYear2 = localStorage.getItem("year").trim().slice(-2);
      if (isNaN(lastYear2) == false) {
        lastYear = localStorage.getItem("year").trim().slice(-2);
      }
    }

    if (lastName && lastYear) {
      let shortTag = document.createElement("strong");
      shortTag.style.fontSize = authSizeFinal;
      shortTag.textContent = lastName + " " + lastYear + " ";
      lineTwo.prepend(shortTag);
    } else if (lastName) {
      let shortTag = document.createElement("strong");
      shortTag.style.fontSize = authSizeFinal;
      shortTag.textContent = lastName + " ";
      lineTwo.prepend(shortTag);
    } else if (lastYear) {
      let shortTag = document.createElement("strong");
      shortTag.textContent = myPub + " " + lastYear + " ";
      lineTwo.prepend(shortTag);
    } else {
      let shortTag = document.createElement("strong");
      shortTag.textContent = myPub + " ";
      lineTwo.prepend(shortTag);
    }
  } else {
    if (localStorage.getItem("useBracketsS") == "true") {
      lineTwo.textContent = "[" + textContentString.join(", ") + "]";
    } else {
      lineTwo.textContent = textContentString.join(", ");
    }
    if (
      localStorage.getItem("initials") &&
      document.getElementById("initialsCheck").checked
    ) {
      lineTwo.textContent += " " + localStorage.getItem("initials");
    }
  }

  // Sets content of lines 2-5 excluding 4 //

  lineThreeMark.textContent = myCard;

  lineThreeMark.setAttribute("id", "checked");
  cardTextContainer.setAttribute("class", "cardTextContainer");
  tagContainer.setAttribute("class", "tagContainer");

  // Appends all lines to a div called "cardText" //

  cardText.appendChild(lineOne);
  cardText.appendChild(lineTwo);
  cardText.appendChild(lineBreak);
  cardText.appendChild(lineThreeMark);
  cardTextContainer.appendChild(cardText);
  cardTextContainer.appendChild(tagContainer);

  // Defines the HTML container div to place the div containing the COMPLETE CARD / button //

  let cards = document.getElementById("cards");

  // Prepends the complete card into the HTML div that is NOT dynamically created //

  cards.prepend(cardTextContainer);

  // Appends card text to complete card //

  // sets a bunch of classes //

  cardText.setAttribute("class", "cardText");
  cardText.setAttribute("id", "all");
  $(".cardTextContainer").css("font-family", chosenFont);
  $(".cardText").css("font-family", chosenFont);

  cardText.insertAdjacentHTML("beforeend", texter);

  // On creating new card, search bar is cleared //
  searchBar.value = "";

  // Creates an array from every card inside the OVERALL container and makes it visible to UNDO search when new card is added//
  const cardTextEls = document.getElementsByClassName("cardText");

  Array.from(cardTextEls).forEach(function (cardTextEl) {
    cardTextEl.parentNode.style.display = "block";
    $(cardTextEl).siblings(".tagContainer")[0].style.display = "block";
  });

  // Call back functions //
  $("ul li:empty").remove();
  document.getElementById("all").click();
  editing = false;
  $(".cardTextContainer").draggable({
    opacity: 0.5,
    revert: true,
  });

  warningNoCard();
  callDrag();
}

// Hides or unhides on search //

let storageContainer = document.getElementById("cards");
const searchBar = document.getElementById("searchInput");

searchBar.addEventListener("keyup", function (e) {
  search();
});

function search() {
  const term = searchBar.value.toLowerCase();
  const cardTextEls = $(".cardText:visible").toArray();
  cardTextEls.forEach(function (cardTextEl) {
    const title = cardTextEl.textContent;
    if (title.toLowerCase().indexOf(term) != -1) {
      cardTextEl.parentNode.style.display = "block";
      warningNoCard();
    } else {
      cardTextEl.parentNode.style.display = "none";
      cardTextEl.classList.add("hided");
      warningNoCard();
    }
  });

  const hiddenCards = $(".hided").toArray();

  hiddenCards.forEach(function (hiddenCard) {
    const titl = hiddenCard.textContent;

    if (titl.toLowerCase().indexOf(term) != -1) {
      hiddenCard.parentNode.style.display = "block";
      warningNoCard();
      hiddenCard.classList.remove("hided");
    }
  });
}

var target = document.getElementById("cards");
// create an observer instance
var observer = new MutationObserver(function (mutations) {
  warningNoCard();
});
// configuration of the observer:

var config = {
  attributes: true,
  childList: true,
  characterData: true,
};

// pass in the target node, as well as the observer options
observer.observe(target, config);

function warningNoCard() {
  const checkIfNone = document.getElementById("cards").innerText;
  if (checkIfNone !== "") {
    document.getElementById("noCardsWarning").style.display = "none";
  } else {
    document.getElementById("noCardsWarning").style.display = "flex";
  }
}

$(document).on("click", ".cardText", function (e) {
  if (
    e.target.classList.contains("ui-card-container") ||
    e.target.classList.contains("iconstyle")
  ) {
  } else {
    let log = $(this).closest("div").find(".urlFind").attr("id");
    createURL(log);
  }
});

let edit = false;

function createURL(url) {
  chrome.tabs.query({}, function (tabs) {
    if (edit === false) {
      var doFlag = true;
      for (var i = tabs.length - 1; i >= 0; i--) {
        if (tabs[i].url === url) {
          doFlag = false;
          chrome.tabs.update(tabs[i].id, {
            active: true,
          });
          break;
        }
      }
      if (doFlag) {
        window.open(url);
      }
    }
  });
}

const cm = document.querySelector(".custom-cm");
var clickTargeter;

$(document).on("click", ".clickeredit", (e) => {
  callDrag();
  $(".custom-cm").hide();
  clickTargeter = e.target.closest("div.cardText");
  clickTargeter.setAttribute("contenteditable", "true");
  $(clickTargeter).css("cursor", "text");
  edit = true;
  $(".cardTextContainer").draggable("destroy");
  clickTargeter.focus();
  document.execCommand("selectAll", false, null);
  // collapse selection to the end
  document.getSelection().collapseToEnd();
});

$(document).on("click", ".clickercopy", (e) => {
  clickTargeter = e.target.closest("div.cardText");
  const node = clickTargeter;
  const clone = node.cloneNode(true);
  const elems = clone.querySelector(".ui-card-container");
  elems.remove();
  let copyTarget = clone.outerHTML;
  copyToClip(copyTarget);
});

$(document).on("click", ".clickertrash", (e) => {
  clickTargeter = e.target.closest("div.cardText");

  clickTargeter.parentNode.remove();
  warningNoCard();
});

var clickTarget;

$(document).bind("contextmenu", function (e) {
  $(".custom-cm").hide();
  $(".custom-cm2").hide();
  $(".custom-cm3").hide();
  let container = $(".cardText");
  if (!container.is(e.target) && container.has(e.target).length === 0) {
    $(".custom-cm").hide();
    $(".custom-cm2").hide();
    $(".custom-cm3").hide();
  } else if (editing == false) {
    if (
      e.target.classList.contains("ui-card-container") == false &&
      e.target.classList.contains("iconstyle") == false
    ) {
      clickTarget = e.target.closest("div");

      // Avoid the real one
      e.preventDefault();
      if (clickTarget.id === "all") {
        document.getElementById("removeFromGro").style.display = "none";
      }
      // Show contextmenu
      if (edit) {
        if (window.getSelection().toString() != "") {
          $(".custom-cm3")
            .finish()
            .toggle()
            // In the right position (the mouse)
            .css({
              top: e.pageY + "px",
              left: e.pageX + "px",
            });
        } else {
        }
      } else {
        $(".custom-cm")
          .finish()
          .toggle()
          // In the right position (the mouse)
          .css({
            top: e.pageY + "px",
            left: e.pageX + "px",
          });
      }
    }
  } else {
    e.preventDefault();
  }
});

// If the document is clicked somewhere
$(document).bind("mousedown", function (e) {
  // If the clicked element is not the menu
  if (
    !$(e.target).parents(".custom-cm").length > 0 &&
    !$(e.target).parents(".cardText").is(clickTarget) &&
    !$(e.target).parents(".cardText").is(clickTargeter) &&
    !$(e.target).is(clickTarget) &&
    !$(e.target).is(clickTargeter) &&
    !$(e.target).parents(".custom-cm3").length > 0
  ) {
    // Hide it
    $(".custom-cm").hide();
    if (clickTarget) {
      clickTarget.setAttribute("contenteditable", "false");
      edit = false;
      $(".cardText").css("cursor", "pointer");
      callDrag();
    }
    if (clickTargeter) {
      clickTargeter.setAttribute("contenteditable", "false");
      edit = false;
      $(".cardText").css("cursor", "pointer");
      callDrag();
    }
  }
});

$(document).bind("mousedown", function (e) {
  if (!$(e.target).parents(".custom-cm3").length > 0) {
    $(".custom-cm3").hide();
  }
});

// If the menu element is clicked
$(".custom-cm li").click(function () {
  // This is the triggered action name
  switch ($(this).attr("data-action")) {
    // A case for each action. Your actions here
    case "copy":
      let copyTargeter = clickTarget;
      const node = copyTargeter;
      const clone = node.cloneNode(true);
      const elems = clone.querySelector(".ui-card-container");
      elems.remove();
      let copyTarget = clone.outerHTML;
      copyToClip(copyTarget);
      break;
    case "edit":
      clickTarget.setAttribute("contenteditable", "true");
      $(clickTarget).css("cursor", "text");
      edit = true;
      $(".cardTextContainer").draggable("destroy");
      clickTarget.focus();
      document.execCommand("selectAll", false, null);
      // collapse selection to the end
      document.getSelection().collapseToEnd();

      break;
    case "delete":
      clickTarget.parentNode.remove();
      warningNoCard();
      break;

    case "standardizeHighlighting":
      let gather = Array.from(clickTarget.querySelectorAll("*"));
      gather.forEach(function (elem) {
        if (elem.style.backgroundColor != "") {
          elem.style.backgroundColor = localStorage.getItem("colorSelect");
        }
      });
      break;

    case "shrinkUnformatted":
      let gather2 = Array.from(
        $(clickTarget).find("#checked")[0].querySelectorAll("*")
      );
      if (gather2.length == 0) {
        let gatherNew = $(clickTarget).find("#checked")[0];
        $(gatherNew).css("font-size", shrinkSizeFinal);
      } else {
        gather2.forEach(function (elem) {
          if (
            elem.tagName != "U" &&
            elem.tagName != "B" &&
            elem.style.backgroundColor == "" &&
            elem.parentNode.tagName != "U" &&
            elem.parentNode.tagName != "B"
          ) {
            $(elem).css("font-size", shrinkSizeFinal);
          }
        });
      }

      break;
  }

  // Hide it AFTER the action was triggered
  $(".custom-cm").hide();
});

function copyToClip(str) {
  function listener(e) {
    e.clipboardData.setData("text/html", str);
    e.preventDefault();
  }
  document.addEventListener("copy", listener);
  document.execCommand("copy");
  document.removeEventListener("copy", listener);
}
let opened;

function checkOpen() {
  if (localStorage.getItem("opened")) {
    if (localStorage.getItem("opened") == "true") {
      document.getElementById("ui-contain").style.width = "300px";
      document.getElementById("open").style.width = "300px";
      document.getElementById("cover-hamburger").style.width = "300px";
      opened = true;
      setTimeout(() => {
        document.getElementById("ui-contain").style.display = "block";
        document.getElementById("open").style.display = "block";
        document.getElementById("cover-hamburger").style.display = "block";
      }, 1);
    }

    if (localStorage.getItem("opened") == "false") {
      document.getElementById("open").style.width = "0px";
      document.getElementById("cover-hamburger").style.width = "0px";
      document.getElementById("ui-contain").style.width = "0px";
      opened = false;
      setTimeout(() => {
        document.getElementById("ui-contain").style.display = "block";
        document.getElementById("open").style.display = "block";
        document.getElementById("cover-hamburger").style.display = "block";
      }, 1);
    }
  } else {
    localStorage.setItem("opened", "true");
    document.getElementById("ui-contain").style.width = "300px";
    document.getElementById("open").style.width = "300px";
    document.getElementById("cover-hamburger").style.width = "300px";
    opened = true;
    setTimeout(() => {
      document.getElementById("ui-contain").style.display = "block";
      document.getElementById("open").style.display = "block";
      document.getElementById("cover-hamburger").style.display = "block";
    }, 1);
  }
}

var editing = false;

document.getElementById("check").addEventListener("click", function () {
  if (opened === true && editing === false) {
    removeExport();
    $("#successMessage").remove();
    document.getElementById("open").style.width = "0px";
    document.getElementById("cover-hamburger").style.width = "0px";
    document.getElementById("ui-contain").style.width = "0px";
    opened = false;
    localStorage.setItem("opened", "false");
  } else if (opened === false && editing === false) {
    document.getElementById("ui-contain").style.width = "300px";
    document.getElementById("open").style.width = "300px";
    document.getElementById("cover-hamburger").style.width = "300px";
    opened = true;
    localStorage.setItem("opened", "true");
  }
});

document.querySelectorAll("*").forEach(function (elem) {
  elem.addEventListener("scroll", function () {
    $(".custom-cm").hide();
    $(".custom-cm2").hide();
    $(".custom-cm3").hide();
  });
});

var clickTarget2;

$(document).bind("contextmenu", function (e) {
  clickTarget2 = e.target.closest("li");
  let allCardsButton = document.getElementById("all");
  let unsortedButton = document.getElementById("unsorted");
  let container = $(".group-container-open");
  if (e.target.classList.contains("defaultHeading") == false) {
    if (!container.is(e.target) && container.has(e.target).length === 0) {
    } else if (
      clickTarget2 == null &&
      editing === false &&
      exportingSequence == false
    ) {
      if (
        (e.target.id != "cover-hamburger" &&
          e.target.id != "groupnotouch" &&
          e.target.id != "headingnotouch" &&
          e.target.id == "listContainer") ||
        e.target.id == "listContainerWrapper"
      ) {
        e.preventDefault();
        $(".custom-cm2")
          .finish()
          .toggle()
          // In the right position (the mouse)
          .css({
            top: e.pageY + "px",
            left: e.pageX + "px",
          });

        if (clickTarget2 === null) {
          document.getElementById("editing").style.display = "none";
          document.getElementById("deleting").style.display = "none";
          document.getElementById("nullAdd").style.display = "block";
          document.getElementById("headingadd").style.display = "block";
        } else {
          document.getElementById("editing").style.display = "block";
          document.getElementById("deleting").style.display = "block";
          document.getElementById("nullAdd").style.display = "none";
          document.getElementById("headingadd").style.display = "none";
        }
      }
    } else if (
      editing === false &&
      exportingSequence === false &&
      clickTarget2 !== allCardsButton &&
      clickTarget2 !== unsortedButton
    ) {
      // Avoid the real one
      e.preventDefault();

      if (clickTarget2 === null) {
        document.getElementById("editing").style.display = "none";
        document.getElementById("deleting").style.display = "none";
        document.getElementById("nullAdd").style.display = "block";
        document.getElementById("headingadd").style.display = "block";
      } else {
        document.getElementById("editing").style.display = "block";
        document.getElementById("deleting").style.display = "block";
        document.getElementById("nullAdd").style.display = "none";
        document.getElementById("headingadd").style.display = "none";
      }

      // Show contextmenu

      $(".custom-cm2")
        .finish()
        .toggle()
        // In the right position (the mouse)
        .css({
          top: e.pageY + "px",
          left: e.pageX + "px",
        });
    }
  }
});

let guid = () => {
  return Math.random();
};

$(".custom-cm2 li").click(function () {
  // This is the triggered action name
  switch ($(this).attr("data-action")) {
    // A case for each action. Your actions here
    case "edit":
      editing = true;
      clickTarget2.setAttribute("contenteditable", "true");
      clickTarget2.focus();
      document.execCommand("selectAll", false, null);
      document.getSelection().collapseToEnd();
      clickTarget2.style.cursor = "text";
      $(clickTarget2).on("blur", function () {
        if (clickTarget2 != null) {
          if (clickTarget2.innerText.length > 0) {
            clickTarget2.contentEditable = "false";
            let gotID = clickTarget2.id;
            let checkCards = document.querySelectorAll(`p[id="${gotID}"]`);
            Array.from(checkCards).forEach(function (groupTag) {
              groupTag.innerHTML =
                clickTarget2.innerText +
                `<i title="Remove from group" class="fa-solid fa-xmark" ></i>`;
            });

            editing = false;
          } else {
            editing = false;
            $("ul li:empty").remove();
          }
        }
      });

      $("#listContainer  li:last-child").keypress(function (e) {
        var keycode = e.keyCode ? e.keyCode : e.which;
        if (keycode == "13") {
          e.preventDefault();
          if (clickTarget2.innerText.length > 0) {
            clickTarget2.contentEditable = "false";
            let gotID = clickTarget2.id;
            let checkCards = document.querySelectorAll(`p[id="${gotID}"]`);
            Array.from(checkCards).forEach(function (groupTag) {
              groupTag.textContent = clickTarget2.innerText;
            });
            $(".listItem").attr("contenteditable", "false");
            $(".listItem").css("cursor", "pointer");
            editing = false;
            callDrag();
          } else {
            editing = false;
            $("ul li:empty").remove();
          }
        }
      });

      $(".custom-cm2").hide();
      break;
    case "delete":
      // note
      let clickedID = clickTarget2.id;
      const cardTextEls = document.getElementsByClassName("cardText");
      Array.from(cardTextEls).forEach(function (cardTextEl) {
        if (cardTextEl.classList.contains(clickedID)) {
          // come back here //
          $(cardTextEl).removeClass(clickedID);
          $(cardTextEl)
            .siblings(".tagContainer")[0]
            .querySelector(`p[id="${clickedID}"]`)
            .remove();
        }
      });
      clickTarget2.parentNode.removeChild(clickTarget2);
      $(".custom-cm2").hide();
      break;

    case "nullAdd":
      $("#listContainer").append(
        $("<li></li>").addClass("listItem sortable-item")
      );
      let newItem3 = $("#listContainer li:last-child").get(0);
      $("#listContainer  li:last-child").attr("id", guid);
      newItem3.contentEditable = "true";
      newItem3.focus();

      newItem3.style.cursor = "text";
      $("#listContainer  li:last-child").on("blur", function (e) {
        if (newItem3.innerText.length > 0) {
          newItem3.contentEditable = "false";
          editing = false;
          callDrag();
        } else {
          editing = false;
          e.preventDefault();
          $("ul li:empty").remove();
        }
      });

      $("#listContainer  li:last-child").keypress(function (e) {
        var keycode = e.keyCode ? e.keyCode : e.which;
        if (keycode == "13") {
          e.preventDefault();
          if (newItem3.innerText.length > 0) {
            $(".listItem").attr("contenteditable", "false");
            $(".listItem").css("cursor", "pointer");
            editing = false;
            callDrag();
          } else {
            editing = false;
            $("ul li:empty").remove();
          }
        }
      });

      $(".custom-cm2").hide();
      callDrag();
      break;

    case "heading":
      $("#listContainer").append(
        $("<li></li>").addClass("listItem sortable-item")
      );
      let newItem4 = $("#listContainer li:last-child").get(0);
      $("#listContainer  li:last-child").attr("id", "heading");
      newItem4.contentEditable = "true";
      newItem4.focus();

      newItem4.style.cursor = "text";
      $("#listContainer  li:last-child").on("blur", function (e) {
        if (newItem4.innerText.length > 0) {
          newItem4.contentEditable = "false";
          editing = false;
          callDrag();
        } else {
          editing = false;
          $("ul li:empty").remove();
        }
      });

      $("#listContainer  li:last-child").keypress(function (e) {
        var keycode = e.keyCode ? e.keyCode : e.which;
        if (keycode == "13") {
          e.preventDefault();
          if (newItem4.innerText.length > 0) {
            $(".listItem").attr("contenteditable", "false");
            $(".listItem").css("cursor", "pointer");
            editing = false;
            callDrag();
          } else {
            editing = false;
            $("ul li:empty").remove();
          }
        }
      });
      $(".custom-cm2").hide();
      callDrag();
      break;
  }
});

$(document).bind("click", function (e) {
  // If the clicked element is not the menu
  if (!$(e.target).parents(".custom-cm2").length > 0) {
    $(".custom-cm2").hide();
    if (!$(e.target).is(".listItem") && editing === false) {
      $(".custom-cm2").hide();
      $(".listItem").attr("contenteditable", "false");
      $(".listItem").css("cursor", "pointer");
    }
  }
});
var allSelected = true;
var unsortedSelected = false;

// .listItem click //
$(document).on("click", ".listItem", function (e) {
  if (e.target.id === "heading" || e.target.classList.contains("checkList")) {
  } else if (editing) {
  } else {
    allSelected = false;
    unsortedSelected = false;
    let idChecked = e.target.id;
    const cardTextEls = document.querySelectorAll(".cardText");
    $(this).css("backgroundColor", "#f0f0f0");

    $("li").not($(this)).css("backgroundColor", "white");
    Array.from(cardTextEls).forEach(function (cardTextEl) {
      if (cardTextEl.classList.contains(idChecked)) {
        // come back here //

        cardTextEl.parentNode.style.display = "block";
      } else {
        cardTextEl.parentNode.style.display = "none";
      }
    });
    warningNoCard();
    search();
  }
});

$("#all").bind("click", clickAll);
$("#unsorted").bind("click", clickUnsorted);

function clickAll() {
  const cardTextEls = document.getElementsByClassName("cardText");

  $("#all").css("backgroundColor", "#f0f0f0");
  $("li").not($("#all")).css("backgroundColor", "white");
  $("#unsorted").not($("#all")).css("backgroundColor", "white");

  Array.from(cardTextEls).forEach(function (cardTextEl) {
    cardTextEl.parentNode.style.display = "block";
    $(cardTextEl).siblings(".tagContainer")[0].style.display = "block";
  });
  allSelected = true;
  unsortedSelect = false;
  warningNoCard();
  search();
}

function clickUnsorted() {
  unsortedSelected = true;
  allSelected = false;
  let allCards = document.getElementsByClassName("cardText");
  $("#unsorted").css("backgroundColor", "#f0f0f0");
  $("#all").not($("#unsorted")).css("backgroundColor", "white");
  $("li").not($("#unsorted")).css("backgroundColor", "white");

  Array.from(allCards).forEach(function (card) {
    if (card.classList[1]) {
      card.parentNode.style.display = "none";
    } else {
      card.parentNode.style.display = "block";
    }
  });
  warningNoCard();
  search();
}

function callDrag() {
  $("#listContainer").sortable({
    axis: "y",

    revert: 100,
    animation: 200,
    cancel: "[contentEditable=true]",
    tolerance: "pointer",

    start: function (event, ui) {
      ui.placeholder.height(ui.item.height());

      $(ui.item).click();
      $(ui.item).css("backgroundColor", "rgb(236, 236, 236)");
    },

    stop: function (ui) {
      $("#heading").css("backgroundColor", "rgb(255, 255, 255)");
    },
  });

  $(".cardTextContainer").draggable({
    opacity: 0.5,
    revert: true,
    drag: function () {
      $(this).css("z-index", "1000");
    },

    stop: function () {
      $(this).css("z-index", "0");
    },
  });

  $(".listItem,.all-decorate")
    .not("#heading,#unsorted,#all")
    .droppable({
      over: function (event, ui) {
        if ($(ui.draggable).hasClass("listItem")) {
        } else {
          $(this).css("backgroundColor", "rgb(220, 220, 220)");
        }
      },

      tolerance: "pointer",

      out: function (event, ui) {
        $(this).css("backgroundColor", "white");
      },
      drop: function (event, ui) {
        if ($(ui.draggable).hasClass("listItem")) {
        } else {
          initialId = $(ui.draggable).attr("id");
          $(this).css("backgroundColor", "white");
          let idset = $(this)[0].id;
          $(ui.draggable).find(".cardText").addClass(idset);

          if (
            document.getElementById(initialId) != null &&
            allSelected == false &&
            unsortedSelected == false
          ) {
            document.getElementById(initialId).click();
          } else if (allSelected == true) {
            document.getElementById("all").click();
          } else if (unsortedSelected == true) {
            document.getElementById("unsorted").click();
          }
          setTimeout(function () {
            tagTest(idset);
            if (
              document.getElementById("unsorted").style.backgroundColor ==
              "rgb(240, 240, 240)"
            ) {
              clickUnsorted();
            }
          }, 400);
        }
      },
    });
}

$("#listContainer").sortable({
  axis: "y",
  cancel: "[contentEditable=true]",
  tolerance: "pointer",
});
callDrag();

setTimeout(() => {
  $(".listItem").prop("contenteditable", "false");
  $(".cardText").prop("contenteditable", "false");
  $(".cardText").css("cursor", "pointer");
  $("ul li:empty").remove();
  editing = false;
  edit = false;
  $(".cardText").css("cursor", "pointer");
}, 10);

var plsdo = false;
setTimeout(() => {
  plsdo = true;
}, 200);

let dont = true;
let doit = false;

let deleter = document.getElementById("causedelete");

document.getElementById("causedelete").addEventListener("click", function () {
  if (allSelected) {
    setTimeout(() => {
      if (
        confirm(
          "Are you sure you want to delete ALL cards? This cannot be undone."
        )
      ) {
        $("#cards > div:visible").remove();
        warningNoCard();
        deleter.style.backgroundColor = "rgb(137 75 75)";
      } else {
        deleter.style.backgroundColor = "rgb(137 75 75)";
      }
    }, 300);
  } else if (unsortedSelected) {
    setTimeout(() => {
      if (
        confirm(
          "Are you sure you want to delete all UNSORTED cards? This cannot be undone."
        )
      ) {
        $("#cards > div:visible").remove();
        warningNoCard();
        deleter.style.backgroundColor = "rgb(137 75 75)";
      } else {
        deleter.style.backgroundColor = "rgb(137 75 75)";
      }
    }, 300);
  } else {
    setTimeout(() => {
      if (
        confirm(
          "Are you sure you want to delete all cards from this group? This cannot be undone."
        )
      ) {
        $("#cards > div:visible").remove();
        warningNoCard();
        deleter.style.backgroundColor = "rgb(135, 45, 45)";
      } else {
        deleter.style.backgroundColor = "rgb(137 75 75)";
      }
    }, 300);
  }
});

document.getElementById("causecopy").addEventListener("click", function () {
  let copyB = [];

  let copyTarget = $("#cards > div:visible").toArray();

  $.each(copyTarget, function () {
    const node = $(this).get(0);
    const clone = node.cloneNode(true);
    const elems = clone.querySelectorAll(".ui-card-container");
    const tags = clone.querySelectorAll(".tagContainer");
    for (const elem of elems) {
      elem.remove();
    }

    for (const tag of tags) {
      tag.remove();
    }

    copyB.push(clone);
  });

  var card = "";
  $.each(copyB, function (value) {
    card += $(this).prop("outerHTML") + "<br>";
    copyToClip(card);
  });
});

let copier = document.getElementById("causecopy");

$(document).on("click", "#helpPage", function () {
  window.open("useandinstall.pdf");
});

let authSizeFinal;
let citeSizeFinal;
let shrinkSizeFinal;
let normSizeFinal;
let tagSizeFinal;

function checkFontSize() {
  if (localStorage.getItem("tagSize")) {
    tagSizeFinal = localStorage.getItem("tagSize") + "pt";
    $("#tagSize").val(localStorage.getItem("tagSize"));
  } else {
    tagSizeFinal = "11pt";
  }

  if (localStorage.getItem("authSize")) {
    authSizeFinal = localStorage.getItem("authSize") + "pt";
    $("#authSize").val(localStorage.getItem("authSize"));
  } else {
    authSizeFinal = "11pt";
  }

  if (localStorage.getItem("citeSize")) {
    citeSizeFinal = localStorage.getItem("citeSize") + "pt";
    $("#citeSize").val(localStorage.getItem("citeSize"));
  } else {
    citeSizeFinal = "11pt";
  }

  if (localStorage.getItem("normSize")) {
    normSizeFinal = localStorage.getItem("normSize") + "pt";
    $("#normSize").val(localStorage.getItem("normSize"));
  } else {
    normSizeFinal = "11pt";
  }

  if (localStorage.getItem("shrinkSize")) {
    shrinkSizeFinal = localStorage.getItem("shrinkSize") + "pt";
    $("#shrinkSize").val(localStorage.getItem("shrinkSize"));
  } else {
    shrinkSizeFinal = "7.5pt";
  }
}

window.onload = function () {
  if (localStorage.getItem("colorPickerVale")) {
    document.getElementById("color_picker_wrapper").style.backgroundColor =
      localStorage.getItem("colorPickerVale");
    $(".tagStyle").css(
      "background-color",
      localStorage.getItem("colorPickerVale")
    );
    document.getElementById("tagColor").value =
      localStorage.getItem("colorPickerVale");
  } else {
    document.getElementById("color_picker_wrapper").style.backgroundColor =
      "#cbdee8";
    document.getElementById("tagColor").value = "#cbdee8";
  }

  checkFontSize();

  document.getElementById("listContainer").innerHTML =
    localStorage.getItem("localGroups");

  document.getElementById("cards").innerHTML =
    localStorage.getItem("localValue");
  checkLegacy();
  document.getElementById("all").click();
  $("li").not($("#all")).css("backgroundColor", "white");

  if (localStorage.getItem("initials")) {
    document.getElementById("initials").value =
      localStorage.getItem("initials");
  }

  callDrag();
  setOnLocal();
  checkBoxes();
  checkTut();
  checkOpen();
  removeExport();
  fixCardAdjustment();

  $("#successMessage").remove();
  setTimeout(() => {
    $(".tagStyle").css("background-color", color_picker.value);
  }, 100);
};

function fixCardAdjustment() {
  $(".cardTextContainer").css("top", "0px");
  $(".cardTextContainer").css("left", "0px");
  $(".cardTextContainer").css("right", "0px");
  $(".cardTextContainer").css("bottom", "0px");
  $(".cardTextContainer").removeClass("ui-draggable-dragging");
  $(".cardTextContainer").css("opacity", "1");
  $(".cardTextContainer").css("z-index", "0");
}

$(document).on("click", ".allCheck", function () {
  $(".checkList").prop("checked", true);
  checkAll = true;
});

$(document).on("change", ".checkList", function () {
  if (!this.checked) {
    if ($(".allCheck").is(":checked")) {
      $(".allCheck").prop("checked", false);
    }
  }
});

$("#initials").on("input", function () {
  localStorage.setItem("initials", $(this).val());
});

function setOnLocal() {
  localStorage.setItem(
    "localValue",
    document.getElementById("cards").innerHTML
  );
  localStorage.setItem(
    "localGroups",
    document.getElementById("listContainer").innerHTML
  );
  setTimeout(() => {
    setOnLocal();
  }, 100);
}

$(window).bind("click", function (e) {});

async function readFromClipboard() {
  try {
    let text = await navigator.clipboard.readText();
    if (text.indexOf("splitstringatthispoint454234523234") != -1) {
      inputCards(text);
    } else {
      alert("Import invalid. Please try again.");
    }
  } catch (error) {}
}

async function writeToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {}
}

let color2;

let color3;

$("div[contenteditable]").keydown(function (e) {
  // trap the return key being pressed
  if (e.keyCode === 13) {
    // insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
    document.execCommand("insertHTML", false, "<br/>");
    // prevent the default behaviour of return key pressed
    return false;
  }
});

window.addEventListener("keydown", function (event) {
  var checker = "notchecked";
  if (window.getSelection().anchorNode.parentElement.closest("p")) {
    // non-IE
    if (window.getSelection().anchorNode.parentElement.closest(".cardText")) {
      checker = "checked";
    }
  }
  if (
    (event.altKey && checker === "checked") ||
    (event.ctrlKey && checker === "checked")
  ) {
    if (event.code === "Digit1") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.execCommand("hiliteColor", false, "transparent");
      document.execCommand("removeFormat");

      document.execCommand("fontSize", false, "7");
      changeFont(shrinkSizeFinal);
    }

    if (event.code === "Digit2") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.execCommand("hiliteColor", false, "transparent");
      document.execCommand("removeFormat");
      document.execCommand("fontSize", false, "7");
      changeFont(normSizeFinal);
    }
    if (event.code === "Digit3") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.execCommand("fontSize", false, "7");
      changeFont(normSizeFinal);
      document.execCommand("underline", false, false);
    }

    if (event.code === "Digit4") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.execCommand("fontSize", false, "7");
      changeFont(normSizeFinal);
      document.execCommand("bold", false, false);
    }

    if (event.code === "Digit5") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.execCommand("fontSize", false, "7");
      changeFont(normSizeFinal);
      document.execCommand(
        "hilitecolor",
        false,
        localStorage.getItem("colorSelect")
      );
    }

    if (event.code === "Digit6") {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.execCommand("removeFormat", false, false);
      document.execCommand("fontSize", false, "7");
      changeFont(normSizeFinal, true, true);
      document.execCommand(
        "hilitecolor",
        false,
        localStorage.getItem("colorSelect")
      );

      document.execCommand("bold", false, false);
      document.execCommand("underline", false, false);
    }
  }
});

function changeFont(fontSize) {
  $("font[size=7]").removeAttr("size").css("font-size", fontSize);
}

function startUp() {
  let localFont = localStorage.getItem("choseFont");
  chosenFont = localFont;
  document.getElementById("fontPick").value = localFont;
  setTimeout(() => {
    $(".current").css("font-family", chosenFont);
  }, 1);

  let localColor = localStorage.getItem("colorSelect");
  if (localColor) {
    color2 = localColor;
    $(".picker").colorPick({ allowCustomColor: true, initialColor: color2 });

    $(".picker").colorPick({
      onColorSelected: function () {
        color3 = this.color;
        localStorage.setItem("colorSelect", color3);
        this.element.css({ backgroundColor: this.color, color: this.color });
      },
    });
  } else {
    color2 = "#b8f8d5";
    $(".picker").colorPick({ allowCustomColor: true, initialColor: color2 });

    $(".picker").colorPick({
      onColorSelected: function () {
        color3 = this.color;
        localStorage.setItem("colorSelect", color3);
        this.element.css({ backgroundColor: this.color, color: this.color });
      },
    });
  }
}
startUp();

$(document).ready(function () {
  $("#fontPick").niceSelect();
});

var mySelect = document.getElementById("fontPick");
mySelect.onchange = (event) => {
  chosenFont = event.target.value;
  localStorage.setItem("choseFont", chosenFont);
  $(".current").css("font-family", chosenFont);
  $(".cardTextContainer").css("font-family", chosenFont);
  $(".cardText").css("font-family", chosenFont);
};

$("#groupnotouch").on("click", function (e) {
  if (exportingSequence) {
  } else {
    addOutsideGroup();
  }
});

$("#headingnotouch").on("click", function (e) {
  if (exportingSequence) {
  } else {
    addOutsideHeading();
  }
});

$("#importnotouch").on("click", function (e) {
  if (exportingSequence) {
  } else {
    readFromClipboard();
  }
});

function inputCards(text) {
  // Splits the string into groups and cards //
  let initialArray = text.split("splitstringatthispoint454234523234");
  let initialGroups = initialArray[0];

  // Array definitions for IDs of groups//
  let importedGroupIDs = [];
  let nativeGroupIDs = [];

  // Array definitions for text content of groups //
  let importedGroupText = [];
  let nativeGroupText = [];

  let cardNamesRenamed = [];
  let cardIDsRenamed = [];

  // Creates psuedo-element for groups //
  var groupPsuedoElement = document.createElement("div");
  groupPsuedoElement.insertAdjacentHTML("beforeend", initialGroups);

  // Grabs all groups from that Psuedo element, puts them into array. Grabs all groups from current DOM //
  let importGroupsToArray = groupPsuedoElement.querySelectorAll(".listItem");
  let nativeGroupsToArray =
    $("#listContainer")[0].querySelectorAll(".listItem");

  // Grabs all IDs from those groups, puts them into array
  importGroupsToArray.forEach(function (group) {
    importedGroupIDs.push(group.id);
  });
  nativeGroupsToArray.forEach(function (group) {
    nativeGroupIDs.push(group.id);
  });
  // Removes groups with common IDs from group psuedo element //
  var commonIDs = importedGroupIDs.filter(
    (id) => nativeGroupIDs.indexOf(id) !== -1
  );
  commonIDs.forEach(function (commonID) {
    let groupRemovable = groupPsuedoElement.querySelectorAll(
      `li[id="${commonID}"]`
    );
    // check card tags to make sure textcontent lines up //
    $(groupRemovable).remove();
    cardIDsRenamed.push(commonID);
  });

  // Grabs content of imported and native groups //
  let noDuplicateIDsImportGroup =
    groupPsuedoElement.querySelectorAll(".listItem");
  noDuplicateIDsImportGroup.forEach(function (group) {
    importedGroupText.push(group.textContent);
  });

  nativeGroupsToArray.forEach(function (group) {
    nativeGroupText.push(group.textContent);
  });
  var commonText = importedGroupText.filter(
    (text) => nativeGroupText.indexOf(text) !== -1
  );
  commonText.forEach(function (sharedName) {
    let textDuplicates = [];
    textDuplicates = [...groupPsuedoElement.querySelectorAll("li")].filter(
      (e) => e.textContent == sharedName
    );
    textDuplicates.forEach(function (duplicate) {
      cardNamesRenamed.push(duplicate.id);
      let dupedText = duplicate.textContent;
      duplicate.textContent = dupedText + " - Imported Duplicate";
    });
  });

  $("#listContainer")[0].insertAdjacentHTML(
    "beforeend",
    groupPsuedoElement.innerHTML
  );

  $(groupPsuedoElement).remove();

  let initialCards = initialArray[1];
  if (initialCards == "") {
  } else {
    var cardPsuedoElement = document.createElement("div");
    cardPsuedoElement.insertAdjacentHTML("beforeend", initialCards);
    // safe point //
    cardIDsRenamed.forEach(function (cardID) {
      let arrayOfCards = [];
      let listGroupText = document.querySelector(
        `li[id="${cardID}"]`
      ).textContent;
      arrayOfCards = cardPsuedoElement.querySelectorAll(`p[id="${cardID}"]`);
      arrayOfCards.forEach(function (card) {
        card.innerHTML =
          listGroupText +
          `<i title="Remove from group" class="fa-solid fa-xmark" ></i>`;
      });
    });
    cardNamesRenamed.forEach(function (renamedID) {
      let arrayOfCards = [];

      let listGroupText = document.querySelector(
        `li[id="${renamedID}"]`
      ).textContent;
      arrayOfCards = cardPsuedoElement.querySelectorAll(`p[id="${renamedID}"]`);
      arrayOfCards.forEach(function (card) {
        card.innerHTML =
          listGroupText +
          `<i title="Remove from group" class="fa-solid fa-xmark" ></i>`;
      });
    });
    $("#cards")[0].insertAdjacentHTML(
      "afterbegin",
      cardPsuedoElement.innerHTML
    );
    $(cardPsuedoElement).remove();
  }

  clickAll();
  $(".tagStyle").css("background-color", color_picker.value);

  setTimeout(() => {
    $(".cardTextContainer").css(
      "font-family",
      localStorage.getItem("choseFont")
    );
    $(".cardText").css("font-family", localStorage.getItem("choseFont"));
  }, 1);
}

$("#exportnotouch").on("click", function () {
  if (exportingSequence) {
  } else {
    $("#successMessage").remove();
    clearTimeout(clearMessage2);
    exportCards();
  }
});

$("#clearnotouch").on("click", function (e) {
  if (exportingSequence) {
  } else if (
    confirm(
      "Are you sure you want to delete ALL groups and headings? You can indiviually delete groups and headings by using the context menu available when you right click on them. WARNING: This cannot be undone."
    )
  ) {
    document.getElementById("listContainer").innerHTML = "";
    document.getElementById("all").click();
    const cardTextEls = document.getElementsByClassName("cardText");
    Array.from(cardTextEls).forEach(function (cardTextEl) {
      if (cardTextEl.id != "ui-card-container") {
        cardTextEl.classList = "cardText";
        let groupTags = $(cardTextEl)
          .siblings(".tagContainer")[0]
          .querySelectorAll("p");
        groupTags.forEach(function (groupTag) {
          groupTag.remove();
        });
      }
    });
  }
});

$('input[type="number"]').on("paste", function (e) {
  e.preventDefault();
});

$('input[type="number"]').on("keydown keyup change", function (e) {
  if (
    $(this).val() > 16 &&
    e.keyCode !== 46 && // keycode for delete
    e.keyCode !== 8 // keycode for backspace
  ) {
    e.preventDefault();
    $(this).val(16);
  }
  localStorage.setItem($(this).attr("id"), $(this).val());
  checkFontSize();
});

$('input[type="number"]').on("keyup change", function (e) {
  if (
    $(this).val().toString()[0] == "-" ||
    $(this).val().toString()[0] == "0" ||
    ($(this).val().toString()[0] == undefined &&
      e.keyCode !== 46 && // keycode for delete
      e.keyCode !== 8)
  ) {
    e.preventDefault();
    $(this).val(1);
    localStorage.setItem($(this).attr("id"), $(this).val());
    checkFontSize();
  } else {
    localStorage.setItem($(this).attr("id"), $(this).val());
    checkFontSize();
  }
});

let clearMessage2;

function exportCardsTo() {
  let idArray = [];
  let cardArray = [];
  let exportGroups = "";
  let exportCards = "";
  let exportArray = [];
  let checkArray = $(".checkList:checked").toArray();
  Array.from(checkArray).forEach(function (checkbox) {
    exportArray.push(checkbox.parentNode);
    idArray.push(checkbox.parentNode.id);
  });
  removeExport();
  exportArray.forEach(function (group) {
    exportGroups += group.outerHTML;
  });

  idArray.forEach(function (id) {
    let rawCard = [];
    if (checkAll) {
      rawCard = document.querySelectorAll(".cardText");
    } else {
      rawCard = document.querySelectorAll(`div[class~="${id}"]`);
    }
    rawCard.forEach(function (card) {
      if (cardArray.includes(card.parentNode.outerHTML)) {
      } else {
        cardArray.push(card.parentNode.outerHTML);
      }
    });
  });

  cardArray.forEach(function (cardHTML) {
    exportCards += cardHTML;
  });
  let strExport =
    exportGroups + "splitstringatthispoint454234523234" + exportCards;
  copyTextToClipboard(strExport);
  $("#listContainerWrapper")[0].insertAdjacentHTML(
    "beforeend",
    `<p id='successMessage'>Copied to clipboard.</p>`
  );
  clearMessage2 = setTimeout(() => {
    $("#successMessage").remove();
  }, 4000);
  exportingSequence = false;
  checkAll = false;
}

function copyTextToClipboard(text) {
  var textArea = document.createElement("textarea");

  //
  // *** This styling is an extra step which is likely not required. ***
  //
  // Why is it here? To ensure:
  // 1. the element is able to have focus and selection.
  // 2. if the element was to flash render it has minimal visual impact.
  // 3. less flakyness with selection and copying which **might** occur if
  //    the textarea element is not visible.
  //
  // The likelihood is the element won't even render, not even a
  // flash, so some of these are just precautions. However in
  // Internet Explorer the element is visible whilst the popup
  // box asking the user for permission for the web page to
  // copy to the clipboard.
  //

  // Place in the top-left corner of screen regardless of scroll position.
  textArea.style.position = "fixed";
  textArea.style.top = 0;
  textArea.style.left = 0;

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = "2em";
  textArea.style.height = "2em";

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  // Clean up any borders.
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";

  // Avoid flash of the white box if rendered for any reason.
  textArea.style.background = "transparent";

  textArea.value = text;

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Unable to copy", err);
  }

  document.body.removeChild(textArea);
}

function exportCards() {
  if (editing) {
  } else if ($("#listContainer").children(".listItem").not("#heading")[0]) {
    exportingSequence = true;
    let allLists = document.querySelectorAll(".listItem:not(#heading)");
    Array.from(allLists).forEach(function (list) {
      $("<input>")
        .attr("type", "checkbox")
        .attr("class", "checkList")
        .prependTo(list);
    });

    $("<input>")
      .attr("type", "checkbox")
      .attr("class", "allCheck")
      .prependTo($(".all-decorate")[0]);

    $("#listContainerWrapper")[0].insertAdjacentHTML(
      "beforeend",
      `<div id="export-button-container">
  <button id="exportButton">Export</button>
  <button id="cancelButton">Cancel</button>
</div>`
    );
  }
}

$(document).on("click", "#cancelButton", function () {
  checkAll = false;
  removeExport();
});
$(document).on("click", "#exportButton", function () {
  exportCardsTo();
});

function removeExport() {
  exportingSequence = false;
  $(".checkList").remove();
  $(".allCheck").remove();
  $("#export-button-container").remove();
}

function addOutsideGroup(e) {
  let che = "xxxx";
  if ($("#listContainer  li:last-child")[0]) {
    che = $("#listContainer  li:last-child")[0].outerText;
  }

  if (che) {
    $("#listContainer").append(
      $("<li></li>").addClass("listItem sortable-item")
    );
    let newItem3 = $("#listContainer li:last-child").get(0);
    $("#listContainer  li:last-child").attr("id", guid);
    setTimeout(() => {
      newItem3.contentEditable = "true";
      newItem3.focus();
      newItem3.style.cursor = "text";
    }, 1);

    $("#listContainer  li:last-child").on("blur", function (e) {
      if (newItem3.innerText.length > 0) {
        newItem3.contentEditable = "false";
        editing = false;
        callDrag();
      } else {
        editing = false;
        $("ul li:empty").remove();
      }
    });

    $("#listContainer  li:last-child").keypress(function (e) {
      var keycode = e.keyCode ? e.keyCode : e.which;
      if (keycode == "13") {
        e.preventDefault();
        if (newItem3.innerText.length > 0) {
          $(".listItem").attr("contenteditable", "false");
          $(".listItem").css("cursor", "pointer");
          editing = false;
          callDrag();
        } else {
          editing = false;
          $("ul li:empty").remove();
        }
      }
    });
    callDrag();
  } else {
    editing = false;
    $("ul li:empty").remove();
  }
}

function addOutsideHeading() {
  let che = "xxxx";
  if ($("#listContainer  li:last-child")[0]) {
    che = $("#listContainer  li:last-child")[0].outerText;
  }
  if (che) {
    $("#listContainer").append(
      $("<li></li>").addClass("listItem sortable-item")
    );
    let newItem4 = $("#listContainer li:last-child").get(0);
    $("#listContainer  li:last-child").attr("id", "heading");
    setTimeout(() => {
      newItem4.contentEditable = "true";
      newItem4.focus();
      newItem4.style.cursor = "text";
    }, 1);

    $("#listContainer  li:last-child").on("blur", function (e) {
      if (newItem4.innerText.length > 0) {
        newItem4.contentEditable = "false";
        editing = false;
        callDrag();
      } else {
        editing = false;
        $("ul li:empty").remove();
      }
    });

    $("#listContainer  li:last-child").keypress(function (e) {
      var keycode = e.keyCode ? e.keyCode : e.which;
      if (keycode == "13") {
        e.preventDefault();
        if (newItem4.innerText.length > 0) {
          $(".listItem").attr("contenteditable", "false");
          $(".listItem").css("cursor", "pointer");
          editing = false;
          callDrag();
        } else {
          editing = false;
          $("ul li:empty").remove();
        }
      }
    });
    callDrag();
  } else {
    editing = false;
    $("ul li:empty").remove();
  }
}

document.getElementById("causesettings").addEventListener("click", function () {
  document.getElementById("msgbx").style.display = "inline";
  document.getElementById("shim").style.display = "inline";
});

document.getElementById("causeformat").addEventListener("click", function () {
  document.getElementById("msgbx2").style.display = "inline";
  document.getElementById("shim").style.display = "inline";
});

document.addEventListener("click", function (e) {
  if (e.target.id == "shim") {
    document.getElementById("msgbx").style.display = "none";
    document.getElementById("msgbx2").style.display = "none";
    document.getElementById("shim").style.display = "none";
  }
});

$("#keyboardShortcuts").change(function () {
  if ($(this).is(":checked")) {
    document.getElementById("keyboardText").style.display = "inline";
    localStorage.setItem("keyboardShort", "true");
  } else {
    document.getElementById("keyboardText").style.display = "none";
    localStorage.setItem("keyboardShort", "false");
  }
});

$("#useBracketsF").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("useBracketsF", "true");
  } else {
    localStorage.setItem("useBracketsF", "false");
  }
});

$("#useBracketsS").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("useBracketsS", "true");
  } else {
    localStorage.setItem("useBracketsS", "false");
  }
});

$("#dateAccessed").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("dateAccessed", "true");
  } else {
    localStorage.setItem("dateAccessed", "false");
  }
});

$("#useLongDate").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("useLongDate", "true");
  } else {
    localStorage.setItem("useLongDate", "false");
  }
});

$("#addShortenedTag").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("shortTagGen", "true");
  } else {
    localStorage.setItem("shortTagGen", "false");
  }
});

$("#initialsCheck").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("inputInitials", "true");
  } else {
    localStorage.setItem("inputInitials", "false");
  }
});

$("#clearingTagCard").change(function () {
  if ($(this).is(":checked")) {
    localStorage.setItem("clearTagCard", "true");
  } else {
    localStorage.setItem("clearTagCard", "false");
  }
});

function checkBoxes() {
  let keyboardShort = localStorage.getItem("keyboardShort");
  let clearTagCard = localStorage.getItem("clearTagCard");
  let useLongDate = localStorage.getItem("useLongDate");
  let useBracketsF = localStorage.getItem("useBracketsF");
  let useBracketsS = localStorage.getItem("useBracketsS");
  let dateAccessed = localStorage.getItem("dateAccessed");

  let shortTagGen = localStorage.getItem("shortTagGen");
  let initials = localStorage.getItem("inputInitials");
  if (keyboardShort == "true") {
    document.getElementById("keyboardText").style.display = "inline";
    $("#keyboardShortcuts").prop("checked", true);
  }

  if (keyboardShort == "false") {
    document.getElementById("keyboardText").style.display = "none";
  }

  if (useBracketsF == "true") {
    $("#useBracketsF").prop("checked", true);
  }

  if (useBracketsF == "false") {
    $("#useBracketsF").prop("checked", false);
  }

  if (useBracketsS == "true") {
    $("#useBracketsS").prop("checked", true);
  }

  if (useBracketsS == "false") {
    $("#useBracketsS").prop("checked", false);
  }

  if (dateAccessed == "false") {
    $("#dateAccessed").prop("checked", false);
  }

  if (dateAccessed == "true") {
    $("#dateAccessed").prop("checked", true);
  }

  if (initials == "true") {
    $("#initialsCheck").prop("checked", true);
  }

  if (initials == "false") {
    $("#initialsCheck").prop("checked", true);
  }

  if (clearTagCard == "true") {
    $("#clearingTagCard").prop("checked", true);
  }

  if (shortTagGen == "true") {
    $("#addShortenedTag").prop("checked", true);
  }

  if (shortTagGen == "true") {
    $("#addShortenedTag").prop("checked", true);
  }

  if (useLongDate == "true") {
    $("#useLongDate").prop("checked", true);
  }

  if (useLongDate == "true") {
    $("#useLongDate").prop("checked", true);
  }
}

checkBoxes();

document.addEventListener("visibilitychange", (event) => {
  if (document.visibilityState === "visible") {
  } else {
    $(".custom-cm").hide();
    $(".custom-cm2").hide();
    $(".custom-cm3").hide();
  }
});

$(".custom-cm3 li").click(function () {
  switch ($(this).attr("data-action")) {
    case "shrink":
      document.execCommand("hiliteColor", false, "transparent");
      document.execCommand("removeFormat");
      document.execCommand("fontSize", false, "7");
      changeFont("7.5pt");
      $(".custom-cm3").hide();
      break;
    case "clear":
      document.execCommand("hiliteColor", false, "transparent");
      document.execCommand("removeFormat");
      document.execCommand("fontSize", false, "7");
      changeFont("11pt");
      $(".custom-cm3").hide();
      break;
    case "underline":
      document.execCommand("fontSize", false, "7");
      changeFont("11pt");
      document.execCommand("underline", false, false);
      $(".custom-cm3").hide();
      break;
    case "bold":
      document.execCommand("fontSize", false, "7");
      changeFont("11pt");
      document.execCommand("bold", false, false);
      $(".custom-cm3").hide();
      break;
    case "highlight":
      document.execCommand("fontSize", false, "7");
      changeFont("11pt");
      document.execCommand(
        "hilitecolor",
        false,
        localStorage.getItem("colorSelect")
      );
      $(".custom-cm3").hide();
      break;
    case "emphasis":
      document.execCommand("removeFormat", false, false);
      document.execCommand("fontSize", false, "7");
      changeFont("11pt", true, true);
      document.execCommand(
        "hilitecolor",
        false,
        localStorage.getItem("colorSelect")
      );

      document.execCommand("bold", false, false);
      document.execCommand("underline", false, false);
      $(".custom-cm3").hide();
      break;
  }
});

$("#applyCurrent").on("click", function () {
  if (
    confirm(
      "Are you sure you want to apply new settings to all cards? NOTE: This will shrink any plain text that hasn't been shrunk already."
    )
  ) {
    // Make array of all cards //
    $("[id*='checked']").each(function (i, el) {
      $(el).find("*").css("font-size", normSizeFinal);
      el.style.fontSize = normSizeFinal;
      let gather2 = el.querySelectorAll("*");
      if (gather2.length == 0) {
        let gatherNew = $(el).find("#checked")[0];
        $(gatherNew).css("font-size", shrinkSizeFinal);
      } else {
        gather2.forEach(function (elem) {
          if (
            elem.tagName != "U" &&
            elem.tagName != "B" &&
            elem.style.backgroundColor == "" &&
            elem.parentNode.tagName != "U" &&
            elem.parentNode.tagName != "B"
          ) {
            $(elem).css("font-size", shrinkSizeFinal);
          }
        });
      }
    });

    $(".urlFind").each(function (i, el) {
      el.style.fontSize = tagSizeFinal;
      $(el)
        .find("*")
        .each(function (i, el) {
          el.style.fontSize = tagSizeFinal;
        });
    });

    $(".fontS").each(function (i, el) {
      if (el.id != "checked") {
        el.style.fontSize = citeSizeFinal;
        $(el)
          .find("*")
          .each(function (i, el) {
            el.style.fontSize = citeSizeFinal;
          });
      }
    });

    $(".fontS").each(function (i, el) {
      if (el.id != "checked") {
        $(el)
          .find("strong")
          .each(function (i, el) {
            el.style.fontSize = authSizeFinal;
          });
      }
    });
  }
});
