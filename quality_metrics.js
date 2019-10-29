var weekly = 0;
for (let pos = 2; pos < process.argv.length; pos++) {
  if (process.argv[pos].startsWith("week=")) {
    weekly = parseInt(process.argv[pos].match(/^week=(\d+)/)[1]);
  }
}

let isDebugRun = process.argv.includes("--debug");

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

const timeWindowsAvg = [
  {
    "name": "Weekly",
    "substr": "&chfieldfrom=-"+(weekly+1)+"ws&chfieldto=-"+weekly+"ws",
    "divby": 1,
  },
  {
    "name": "Avg Last 5 Wks",
    "substr": "&chfieldfrom=-"+(weekly+6)+"ws&chfieldto=-"+(weekly+1)+"ws",
    "divby": 5,
  },
  {
    "name": "Avg Last 13 Wks",
    "substr": "&chfieldfrom=-"+(weekly+14)+"ws&chfieldto=-"+(weekly+1)+"ws",
    "divby": 13,
  },
];

let timeWindowsMedian = [
  {
    "name": "Weekly",
    "substr": "&chfieldfrom=-"+(weekly+1)+"ws&chfieldto=-"+weekly+"ws",
    "divby": 1,
  },
  {
    "name": "Last 5 Wks",
    "substr": "&chfieldfrom=-"+(weekly+6)+"ws&chfieldto=-"+(weekly+1)+"ws",
    "divby": 5,
  },
  {
    "name": "Last 13 Wks",
    "substr": "&chfieldfrom=-"+(weekly+14)+"ws&chfieldto=-"+(weekly+1)+"ws",
    "divby": 13,
  },
];

function outputStructureTimeWindow() {
  return {
    "Weekly": undefined,
    "Avg Last 5 Wks": undefined,
    "Avg Last 13 Wks": undefined,
  }
};

function outputStructureTimeWindowMedian() {
  return {
    "Weekly": undefined,
    "Last 5 Wks": undefined,
    "Last 13 Wks": undefined,
  }
};

const outputStructure = {
  "Bugs, Incoming": {
    "New": outputStructureTimeWindow(),
    "New: blocker": outputStructureTimeWindow(),
    "New: critical": outputStructureTimeWindow(),
    "New: crash": outputStructureTimeWindow(),
    "New: regression": outputStructureTimeWindow(),
  },
  "Bugs, Outgoing": {
    "Closed": outputStructureTimeWindow(),
    "Closed: blocker": outputStructureTimeWindow(),
    "Closed: critical": outputStructureTimeWindow(),
    "Closed: crash": outputStructureTimeWindow(),
    "Closed: regression": outputStructureTimeWindow(),
    "Closed: median time to fix (days)": outputStructureTimeWindowMedian(),
  },
  "Bugs, Open": {
    "blocker": {"Current": undefined},
    "critical": {"Current": undefined},
    "crash": {"Current": undefined},
    "regression": {"Current": undefined},
    "normal": {"Current": undefined},
    "minor": {"Current": undefined},
  },
};

const newQueries = [
  { "name": ["Bugs, Incoming", "New"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=[Bug%20creation]",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: blocker"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&bug_severity=blocker&chfield=%5BBug%20creation%5D",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: critical"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&bug_severity=critical&chfield=%5BBug%20creation%5D",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: crash"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&keywords=crash&chfield=%5BBug%20creation%5D",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Incoming", "New: regression"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&keywords=regression&chfield=[Bug%20creation]",
    "versions": timeWindowsAvg,
  }
];

const closedQueries = [
  { "name": ["Bugs, Outgoing", "Closed"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=cf_last_resolved",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: blocker"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_severity=blocker&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=cf_last_resolved",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: critical"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_severity=critical&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=cf_last_resolved",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: crash"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&keywords=crash&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=cf_last_resolved",
    "versions": timeWindowsAvg,
  },
  { "name": ["Bugs, Outgoing", "Closed: regression"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&keywords=regression&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=cf_last_resolved",
    "versions": timeWindowsAvg,
  }
];

const openQueries = [
  { "name": ["Bugs, Open", "blocker"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_severity=blocker&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED"
  },
  { "name": ["Bugs, Open", "critical"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_severity=critical&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED"
  },
  { "name": ["Bugs, Open", "regression"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&keywords=regression&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED"
  },
  { "name": ["Bugs, Open", "crash"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&keywords=crash&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED"
  },
  { "name": ["Bugs, Open", "normal"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_severity=major&bug_severity=normal&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED"
  },
  { "name": ["Bugs, Open", "minor"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id&bug_type=defect&bug_severity=minor&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED"
  }
];

/* dead code start */
const timeToFixSum = (acc, curr) => acc+(+(Number((new Date(curr.cf_last_resolved)-new Date(curr.creation_time))/(1000*60*60*24)).toFixed()));
/* dead code end */
const timeToFix = (x) => (+(Number((new Date(x.cf_last_resolved)-new Date(x.creation_time))/(1000*60*60*24)).toFixed()));

const closedMedianQueries = [
  { "name": ["Bugs, Outgoing", "Closed: median time to fix (days)"],
    "str":"https://bugzilla.mozilla.org/rest/bug?include_fields=id,cf_last_resolved,creation_time&bug_type=defect&bug_status=RESOLVED&bug_status=VERIFIED&bug_status=CLOSED&resolution=---&resolution=FIXED&resolution=INACTIVE&resolution=INCOMPLETE&resolution=SUPPORT&resolution=EXPIRED&resolution=MOVED&chfield=cf_last_resolved",
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
        getBugzillaCount(q.str+v.substr, 0, 0, function(count) {
            let numberValue = count/v.divby;
            // Show numbers >= 10 without decimal, < 10 with one decimal digit.
            let numberString = numberValue >= 10 ? Math.round(numberValue) : numberValue.toFixed(1);
            outputStructure[q.name[0]][q.name[1]][v.name] = numberString;
          });
      });
    } else {
      getBugzillaCount(q.str, 0, 0, function(count) {
        outputStructure[q.name[0]][q.name[1]]["Current"] = count;
      });
    }
  });
}

function getBugzillaCount(query, startId, count, callback) {
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
          getBugzillaCount(query, data[data.length-1].id, count+data.length, callback);
        } else {
          callback(count);
        }
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