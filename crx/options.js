function loadDomains() {
    $("#domains-list").empty();
    $("#domains-list, #domains-reload").attr("disabled", true);
    $("#domains-reload").text("Loading...");

    chrome.cookies.getAll({}, function(cookies) {
        var domhash = {};
        for (var i = 0; i < cookies.length; i++) {
            var domain = cookies[i].domain;
            if (domain in domhash) {
                domhash[domain] += 1;
            } else {
                domhash[domain] = 1;
            }
        }
        var domain_sort_map = {};
        var domains = [];
        for (var domain in domhash) {
            domains.push(domain);
        }
        domains.sort();

        for (var i = 0; i < domains.length; i++) {
            var domain = domains[i];
            $("<option>").text(domain).data("domain", domain).appendTo("#domains-list");
        }

        $("#domains-list, #domains-reload").attr("disabled", false);
        $("#domains-reload").text("Reload");
    });

    syncDomainSelection();
}

function loadDomain(dom) {
    $("#cookies-list").empty();
    chrome.cookies.getAll({"domain": dom}, function(cookies) {
        cookies.sort(function(a, b) {
            if (a.name != b.name) return a.name.localeCompare(b.name);
            if (a.path != b.path) return a.path.localeCompare(b.path);
            return 0; // ?!
        });
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            if (cookie.domain != dom) continue;
            var text = cookie.name;
            if (cookie.session) text += " [ses]";
            $("<option>").text(text).data("cookie", cookie).appendTo("#cookies-list");
        }
    });

    syncCookieSelection();
}

function syncDomainSelection() {
    var dom = $("#domains-list option:selected").data("domain");
    loadDomain(dom);
}

function syncCookieSelection() {
    var selection = $("#cookies-list option:selected");

    $("#cookie-delete").attr("disabled", selection.length == 0);
    $("#cookieform input, #cookieform button").attr("disabled", selection.length != 1);

    if (selection.length == 1) {
        var cookie = selection.data("cookie");

        $("#cookieform input").each(function() {
            var name = $(this).attr("name");
            var val;
            switch (name) {
                case "expire":
                    val = cookie.session ? "N/A" : (new Date(cookie.expirationDate * 1000)).toString();
                    break;
                default:
                    val = cookie[name];
            }
            if ($(this).attr("type") == "checkbox") {
                this.checked = val;
            } else {
                $(this).prop("value", val);
            }
        });
    } else {
        $("#cookieform input").prop("value", "").prop("checked", false);
    }
}

function deleteCookie(cookie, cb) {
    // Using the HTTPS prefix guarantees that we'll remove secure cookies
    chrome.cookies.remove({
        "url": "https://" + cookie.domain + cookie.path,
        "name": cookie.name
    }, cb);
}

function doDeleteCookie() {
    var selection = $("#cookies-list option:selected");
    if (selection.length > 1) {
        if (!confirm("Delete multiple cookies?")) return;
    }
    selection.each(function() {
        var cookie = $(this).data("cookie");
        deleteCookie(cookie, function(details) {
            syncDomainSelection();
        });
    });
}

function cookieIsBlacklisted(cookie) {
    for (var i = 0; i < blacklist.name.length; i++) {
        if (cookie.name == blacklist.name[i])
            return true;
    }
    for (var i = 0; i < blacklist.domain.length; i++) {
        var suffix = blacklist.domain[i];
        var match = cookie.domain.substr(-suffix.length);
        if (match == suffix) return true;
    }
    return false;
}

function clearTrackingCookies() {
    chrome.cookies.getAll({}, function(cookies) {
        var removed = 0;
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            if (cookieIsBlacklisted(cookie)) {
                deleteCookie(cookie);
                removed++;
            }
        }
        if (removed) {
            alert("Deleted " + removed + " cookies!");
            loadDomains();
        } else {
            alert("Nothing found.");
        }
    });
}

$(function() {
    $("#domains-list").on("change", syncDomainSelection);
    $("#cookies-list").on("change", syncCookieSelection);

    $("#domains-reload").click(loadDomains);
    $("#cookie-delete").click(doDeleteCookie);
    $("#cookie-revert").click(syncCookieSelection);
    $("#cookie-clear").click(clearTrackingCookies);

    $("#cookieform input").attr("autocomplete", "off");

    loadDomains();
});
