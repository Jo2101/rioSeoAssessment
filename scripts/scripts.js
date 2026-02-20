let LOCATIONS = [];

// Handlebars templates
let hbCardTemplate;
let hbModalTemplate;

// Preparation for Handlebar templates
function compileHandlebarsTemplates() {
  hbCardTemplate = Handlebars.compile($("#hb-location-card").html());
  hbModalTemplate = Handlebars.compile($("#hb-location-modal").html());
}

// Directions (Google Maps)
function openDirections(location) {
  const destination = encodeURI(
    `${location.address}, ${location.city}, ${location.state} ${location.postal_code}`,
  );
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  window.open(googleMapsUrl, "_blank");
}

//Updating H1 title
function updateResultsTitle(locations) {
  const count = locations.length;
  const zip = locations[0]?.postal_code;

  const title = `Found ${count} Taco Trucks in ${zip}`;

  $("#resultsTitle").text(title);
}

// Render location list using Handlebars
function renderAllLocations(locationArray) {
  let html = "";
  for (let i = 0; i < locationArray.length; i++) {
    // Add a mock distance since the backend doesn't provide one
    if (!locationArray[i].distance) {
      // Generates increasing mock distances (e.g. 0.5, 0.9, 1.3)
      locationArray[i].distance = (0.5 + i * 0.4).toFixed(1) + "miles";
    }
    html += hbCardTemplate(locationArray[i]);
  }
  $("#locationsList").html(html);
}

//Map panel helpers
function showMapLoading() {
  $("#mapPlaceholder,#staticMap,#mapError").addClass("d-none");
  $("#mapLoading").removeClass("d-none");
}

function showMapError() {
  $("#mapLoading,#staticMap").addClass("d-none");
  $("#mapError").removeClass("d-none");
}

//Async Map preload
function showMapImage(url) {
  const $map = $("#staticMap");

  // Create temporary image to preload
  const tempImg = new Image();

  $(tempImg)
    .on("load", function () {
      $("#mapLoading,#mapError").addClass("d-none");
      $map.attr("src", url).removeClass("d-none");
    })
    .on("error", function () {
      showMapError();
    });

  // Start loading image
  tempImg.src = url;
}

function requestMap(loc) {
  showMapLoading();
  if (!loc || !loc.latitude || !loc.longitude) {
    showMapError();
    return;
  }
  const url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${loc.latitude},${loc.longitude}` +
    `&zoom=13` +
    `&size=600x600` +
    `&markers=${loc.latitude},${loc.longitude}` +
    `&key=AIzaSyCAJz__098vTeQTMMWL6nARxZhvaK9pcsg`;

  showMapImage(url);
}

$(document).ready(function () {
  compileHandlebarsTemplates();

  //click handlers
  $("#locationsList").on("click", ".location-card", function () {
    $(".location-card").removeClass("active-card");
    $(this).addClass("active-card");
    const loc = LOCATIONS.find((l) => l.id == $(this).data("id"));

    requestMap(loc);

    $("#resultsTitle").text(`Showing trucks near ${loc.postal_code}`);
    if ($(window).width() < 768) $("#btnMap").click();
  });

  // Mobile Tabs Toggling
  $("#btnList").click(function () {
    $(".mobile-tab").removeClass("active");
    $(this).addClass("active");
    $("#listSection").removeClass("d-none d-md-block").addClass("d-block");
    $("#mapSection").removeClass("d-block").addClass("d-none d-md-block");
  });

  $("#btnMap").click(function () {
    $(".mobile-tab").removeClass("active");
    $(this).addClass("active");
    $("#mapSection").removeClass("d-none d-md-block").addClass("d-block");
    $("#listSection").removeClass("d-block").addClass("d-none d-md-block");
  });

  // overlay popup
  $("#locationsList").on("click", ".more-info-btn", function (e) {
    e.stopPropagation();

    const id = $(this).data("id");
    const selectedLocation = LOCATIONS.find((loc) => loc.id == id);

    if (!selectedLocation) return;

    // Build map URL for modal popup
    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&scale=2&size=600x600&maptype=roadmap&format=png&visual_refresh=true&markers=size:small%7Ccolor:0xff0000%7Clabel:${id}%7C${lat},${lng}&key=AIzaSyCAJz__098vTeQTMMWL6nARxZhvaK9pcsg`;

    //rendering content through Handlebars into custom overlay
    $("#locationOverlayBody").html(hbModalTemplate(selectedLocation));
    $("#modalMapImage").attr("src", mapUrl);

    // Show overlay
    $("#locationOverlay").removeClass("d-none");

    // View Full Details click
    $("#viewFullDetailsBtn")
      .off("click")
      .on("click", function () {
        window.open(selectedLocation.url, "_blank");
      });

    // Modal Directions link click
    $("#modalDirectionsLink")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();
        openDirections(selectedLocation);
      });
  });

  // Close overlay handler
  $("#mapPanel").on("click", "#closeOverlayBtn", function () {
    $("#locationOverlay").addClass("d-none");
  });

  //directions click
  $("#locationsList").on("click", ".directions-btn", function (e) {
    e.stopPropagation();

    const id = $(this).data("id");
    const selectedLocation = LOCATIONS.find((loc) => loc.id == id);

    if (!selectedLocation) return;
    openDirections(selectedLocation);
  });

  //load data
  $.ajax({
    method: "GET",
    url: "mocks/locations.json",
    //https://my.api.mockaroo.com/locations.json?key=a45f1200 (commented due to rate limit)
    dataType: "json",
  })
    .done(function (response) {
      LOCATIONS = response;
      renderAllLocations(LOCATIONS);
      updateResultsTitle(LOCATIONS);
      console.log(response);
      console.log("First item:", response[0]);
    })
    .fail(function (xhr, status, error) {
      console.log("AJAX failed:", xhr, status, error);
      $("#resultsTitle").text("Failed to load locations");
      $("#locationsList").html(
        "<p class='alert alert-danger'>Unable to load locations. Please try again later.</p>",
      );
    });
});
