var weekly = 0;
for (let pos = 2; pos < process.argv.length; pos++) {
  if (process.argv[pos].startsWith("week=")) {
    weekly = parseInt(process.argv[pos].match(/^week=(\d+)/)[1]);
  }
}

let isDebugRun = process.argv.includes("--debug");

const timewindowsWeeks = [
  1,
  5,
  13,
];

const axios = require('axios');

const bugzillaProducts = [
  "Core",
  "DevTools",
  "External Software Affecting Firefox",
  "Firefox",
  "Firefox Build System",
  "Firefox for Android",
  "Firefox for iOS",
  "GeckoView",
  "NSPR",
  "NSS",
  "Toolkit",
  "WebExtensions",
];

const bzAPIOpen = "&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED";
const bzAPIClosed = "&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED";
const bzAPIFixed = "&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=FIXED";
const bzAPINewUndismissed = "&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED";
const bzAPINoIntermittents = "&keywords=intermittent-failure&keywords_type=nowords";

const timeWindowsAvg = [
  {
    "name": "Weekly",
    "substr": "&chfieldfrom=-"+(weekly+timewindowsWeeks[0])+"ws&chfieldto=-"+weekly+"ws",
    "divby": timewindowsWeeks[0],
  },
  {
    "name": `Avg Last ${timewindowsWeeks[1]} Wks`,
    "substr": "&chfieldfrom=-"+(weekly+timewindowsWeeks[1])+"ws&chfieldto=-"+weekly+"ws",
    "divby": timewindowsWeeks[1],
  },
  {
    "name": `Avg Last ${timewindowsWeeks[2]} Wks`,
    "substr": "&chfieldfrom=-"+(weekly+timewindowsWeeks[2])+"ws&chfieldto=-"+weekly+"ws",
    "divby": timewindowsWeeks[2],
  },
];

let timeWindowsMedian = [
  {
    "name": "Weekly",
    "substr": "&chfieldfrom=-"+(weekly+timewindowsWeeks[0])+"ws&chfieldto=-"+weekly+"ws",
    "divby": timewindowsWeeks[0],
  },
  {
    "name": `Last ${timewindowsWeeks[1]} Wks`,
    "substr": "&chfieldfrom=-"+(weekly+timewindowsWeeks[1])+"ws&chfieldto=-"+weekly+"ws",
    "divby": timewindowsWeeks[1],
  },
  {
    "name": `Last ${timewindowsWeeks[2]} Wks`,
    "substr": "&chfieldfrom=-"+(weekly+timewindowsWeeks[2])+"ws&chfieldto=-"+weekly+"ws",
    "divby": timewindowsWeeks[2],
  },
];

function outputStructureTimeWindow() {
  return {
    "Weekly": undefined,
    [`Avg Last ${timewindowsWeeks[1]} Wks`]: undefined,
    [`Avg Last ${timewindowsWeeks[2]} Wks`]: undefined,
  }
};

function outputStructureTimeWindowMedian() {
  return {
    "Weekly": undefined,
    [`Last ${timewindowsWeeks[1]} Wks`]: undefined,
    [`Last ${timewindowsWeeks[2]} Wks`]: undefined,
  }
};

const outputStructure = {
  "Bugs, Incoming": {
    "New": outputStructureTimeWindow(),
    "New: blocker / S1": outputStructureTimeWindow(),
    "New: critical / S2": outputStructureTimeWindow(),
    "New: crash": outputStructureTimeWindow(),
    "New: regression": outputStructureTimeWindow(),
  },
  "Bugs, Outgoing": {
    "Closed": outputStructureTimeWindow(),
    "Closed: blocker / S1": outputStructureTimeWindow(),
    "Closed: critical / S2": outputStructureTimeWindow(),
    "Closed: crash": outputStructureTimeWindow(),
    "Closed: regression": outputStructureTimeWindow(),
    "Closed: median time to fix (days)": outputStructureTimeWindowMedian(),
  },
  "Bugs, Open": {
    "blocker / S1": {"Current": undefined},
    "critical / S2": {"Current": undefined},
    "crash": {"Current": undefined},
    "regression": {"Current": undefined},
    "normal / S3": {"Current": undefined},
    "minor / S4": {"Current": undefined},
  },
};

const newQueries = [
  { "name": ["Bugs, Incoming", "New"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect${bzAPINewUndismissed}${bzAPINoIntermittents}&chfield=[Bug%20creation]&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: blocker / S1"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect${bzAPINewUndismissed}&bug_severity=blocker&bug_severity=S1&chfield=%5BBug%20creation%5D&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: critical / S2"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect${bzAPINewUndismissed}&bug_severity=critical&bug_severity=S2&chfield=%5BBug%20creation%5D&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: crash"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect${bzAPINewUndismissed}&keywords=crash&chfield=%5BBug%20creation%5D&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: regression"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect${bzAPINewUndismissed}&keywords=regression&chfield=[Bug%20creation]&count_only=1`,
    "versions": timeWindowsAvg,
  }
];

const closedQueries = [
  { "name": ["Bugs, Outgoing", "Closed"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect${bzAPIClosed}${bzAPINoIntermittents}&chfield=cf_last_resolved&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: blocker / S1"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&bug_severity=blocker&bug_severity=S1${bzAPIClosed}&chfield=cf_last_resolved&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: critical / S2"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&bug_severity=critical&bug_severity=S2${bzAPIClosed}&chfield=cf_last_resolved&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: crash"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&keywords=crash${bzAPIClosed}&chfield=cf_last_resolved&count_only=1`,
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: regression"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&keywords=regression${bzAPIClosed}&chfield=cf_last_resolved&count_only=1`,
    "versions": timeWindowsAvg,
  }
];

const openQueries = [
  { "name": ["Bugs, Open", "blocker / S1"],
    "str":`https://bugzilla.mozilla.org/rest/bug?bug_type=defect&bug_severity=blocker&bug_severity=S1${bzAPIOpen}&count_only=1`,
  },
  { "name": ["Bugs, Open", "critical / S2"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&bug_severity=critical&bug_severity=S2${bzAPIOpen}&count_only=1`,
  },
  { "name": ["Bugs, Open", "regression"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&keywords=regression${bzAPIOpen}&count_only=1`,
  },
  { "name": ["Bugs, Open", "crash"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&keywords=crash${bzAPIOpen}&count_only=1`,
  },
  { "name": ["Bugs, Open", "normal / S3"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&bug_severity=major&bug_severity=normal&bug_severity=S3${bzAPIOpen}${bzAPINoIntermittents}&count_only=1`,
  },
  { "name": ["Bugs, Open", "minor / S4"],
    "str": `https://bugzilla.mozilla.org/rest/bug?bug_type=defect&bug_severity=minor&bug_severity=S4${bzAPIOpen}${bzAPINoIntermittents}&count_only=1`,
  }
];

/* dead code start */
const timeToFixSum = (acc, curr) => acc+(+(Number((new Date(curr.cf_last_resolved)-new Date(curr.creation_time))/(1000*60*60*24)).toFixed()));
/* dead code end */
const timeToFix = (x) => (+(Number((new Date(x.cf_last_resolved)-new Date(x.creation_time))/(1000*60*60*24)).toFixed()));

const closedMedianQueries = [
  { "name": ["Bugs, Outgoing", "Closed: median time to fix (days)"],
    "str": `https://bugzilla.mozilla.org/rest/bug?include_fields=id,cf_last_resolved,creation_time&bug_type=defect${bzAPIFixed}${bzAPINoIntermittents}&chfield=cf_last_resolved`,
    "mapper":timeToFix,
    "versions": timeWindowsMedian,
  }
];

let requestPromises = [];

// Run Count Queries
runCountQueries(newQueries);
runCountQueries(closedQueries);
runMedianQueries(closedMedianQueries);
runCountQueries(openQueries);

/* Some promises schedule other promises which get added later to the promises
   list. Check if the number of resolved promises matches the count of all
   promises. */
let requestPromisesResolvedCount = 0;

function requestPromisesCallback() {
  if (requestPromisesResolvedCount < requestPromises.length) {
    axios.all(requestPromises)
      .then(requestPromisesCallback);
  } else {
    generateOutput();
  }
}

axios.all(requestPromises)
  .then(requestPromisesCallback);

function getProductQueryString() {
  let queryPart = "";
  for (let product of bugzillaProducts) {
    queryPart += "&product=" + encodeURIComponent(product);
  }
  return queryPart;
}

function runMedianQueries(queries) {
  queries.forEach(function(q) {
    if (q.versions) {
      q.versions.forEach(function(v) {
        getBugzillaMedian(q.str+v.substr, 0, q.mapper, [], 0, function(avg) {
            outputStructure[q.name[0]][q.name[1]][v.name] = avg;
          });
      });
    } else {
      getBugzillaMedian(q.str, 0, q.mapper, [], 0, function(avg) {
        console.log(q.name+" = "+avg);
      });
    }
  });
}

function runCountQueries(queries) {
  queries.forEach(function(q) {
    if (q.versions) {
      q.versions.forEach(function(v) {
        getBugzillaCount(q.str+v.substr, function(count) {
            let numberValue = count/v.divby;
            // Show numbers >= 10 without decimal, < 10 with one decimal digit.
            let numberString = numberValue >= 10 ? Math.round(numberValue) : numberValue.toFixed(1);
            outputStructure[q.name[0]][q.name[1]][v.name] = numberString;
          });
      });
    } else {
      getBugzillaCount(q.str, function(count) {
        outputStructure[q.name[0]][q.name[1]]["Current"] = count;
      });
    }
  });
}

function getBugzillaCount(query, callback) {
  if (!query.includes("product=")) {
    query += getProductQueryString();
  }
  if (isDebugRun) {
    console.log(`Requesting: ${query}`);
  }
  requestPromises.push(
    axios.get(query)
      .then(response => {
        requestPromisesResolvedCount++;
        callback(response.data.bug_count);
      })
      .catch(error => {
        console.log(error);
      })
  );
}

function getBugzillaMedian(query, startId, mapper, mapped, count, callback) {
  if (!query.includes("product=")) {
    query += getProductQueryString();
  }
  if (isDebugRun) {
    console.log(`Requesting: ${query}`);
  }
  requestPromises.push(
    axios.get(query+"&f99=bug_id&o99=greaterthan&v99="+startId)
      .then(response => {
        requestPromisesResolvedCount++;
        var data = response.data.bugs;
        if (data.length > 0) {
          getBugzillaMedian(query, data[data.length-1].id, mapper, mapped.concat(data.map(mapper)), count+data.length, callback);
        } else {
          if (count > 0) {
            mapped.sort((a,b) => a-b);
            callback(mapped[Math.floor(count/2)]);
          } else {
            console.log("No records?");
            callback(0);
          }
        }
      })
      .catch(error => {
        console.log(error);
      })
  );
}

/* dead code start */
function getBugzillaAvg(query, startId, reducer, sum, count, callback) {
  if (!query.includes("product=")) {
    query += getProductQueryString();
  }
  if (isDebugRun) {
    console.log(`Requesting: ${query}`);
  }
  requestPromises.push(
    axios.get(query+"&f99=bug_id&o99=greaterthan&v99="+startId)
      .then(response => {
        requestPromisesResolvedCount++;
        var data = response.data.bugs;
        if (data.length > 0) {
          getBugzillaAvg(query, data[data.length-1].id, reducer, sum+data.reduce(reducer, 0), count+data.length, callback);
        } else {
          if (count > 0) {
            callback(+(Number(sum/count).toFixed()));
          } else {
            console.log("No records?");
            callback(0);
          }
        }
      })
      .catch(error => {
        console.log(error);
      })
  );
}
/* dead code end */

function generateOutput() {
  let output = "";
  for (let category in outputStructure) {
    let firstCategoryOccurrence = true;
    for (let subcategory in outputStructure[category]) {
      let firstSubcategoryOccurrence = true;
      for (let metric in outputStructure[category][subcategory]) {
        if (firstCategoryOccurrence) {
          output += `"${category}",`;
          firstCategoryOccurrence = false
        } else {
          output += `,`;
        }
        if (firstSubcategoryOccurrence) {
          output += `"${subcategory}",`;
          firstSubcategoryOccurrence = false
        } else {
          output += `,`;
        }
        output += `"${metric}",${outputStructure[category][subcategory][metric]}\n`;
      }
    }
  }
  console.log(output);
}