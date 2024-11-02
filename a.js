class Contest {
  constructor() {
    this.name = '';
    this.type = true; // true - CF, false - ICPC
    this.duration = 0; // seconds
    this.problems = [];
    this.points = [];
  }
}

class Submission {
  constructor() {
    this.time = 0;
    this.problem = '';
    this.status = '';
    this.tests_passed = 0;
  }
}

class Contestant {
  constructor() {
    this.handle = '';
    this.subs = [];
    this.type = '';
    this.score = 0;
    this.contest = new Contest();
    this.ranking = []; // information for each problem
  }

  calc(query_time) {
    this.ranking = [];
    this.score = 0;
    if (this.contest.type) {
      for (let i = 0; i < this.contest.problems.length; i++) {
        const problem = this.contest.problems[i];
        const points = this.contest.points[i];
        let wa = 0;
        let ac = false;
        let time = 0;
        let buf = 0;

        for (const sub of this.subs) {
          if (sub.problem === problem && sub.time <= query_time) {
            if (sub.status === "OK" || sub.status === "SKIPPED") {
              time = sub.time;
              ac = true;
              wa += buf;
              buf = 0;
            }
            buf += sub.tests_passed >= 1 ? 1 : 0;
          }
        }
        if (!ac) wa += buf;
        const user_points = ac ? 
          Math.max(Math.floor(0.3 * points), points - Math.floor((120 * points * (time / 60)) / (250 * (this.contest.duration / 60))) - 50 * wa) :
          0;
        this.score += user_points;
        this.ranking.push(user_points > 0 ? user_points.toString() : wa > 0 ? '-' + wa.toString() : '');
      }
    } else {
      // todo 
    }
  }
}

let prev_contest_id = -1
let contest = new Contest();
let c = [];

async function getContest(contest_id) {
  const url = `https://codeforces.com/api/contest.standings?contestId=${contest_id}&asManager=false&from=1&count=1&showUnofficial=true`;
  const response = await fetch(url);
  const data = await response.json();

  contest.name = data.result.contest.name;
  contest.type = data.result.contest.type === "CF";
  contest.duration = data.result.contest.durationSeconds;

  contest.problems = data.result.problems.map(i => i.index);
  contest.points = data.result.problems.map(i => i.points);
}

async function getSubmissions(contest_id) {
  const url = `https://codeforces.com/api/contest.status?contestId=${contest_id}&asManager=false&from=10000`;
  const response = await fetch(url);
  const data = await response.json();

  const users = {};

  for (const s of data.result) {
    if (s.author.participantType !== "CONTESTANT" && s.author.participantType !== "VIRTUAL" && s.author.participationType !== "OUT_OF_COMPETITION") continue;
    const x = new Submission();
    x.time = s.relativeTimeSeconds;
    x.problem = s.problem.index;
    x.status = s.verdict;
    x.tests_passed = s.passedTestCount;

    let user = '';
    let c = false;
    for (const t of s.author.members) {
      if (c) user += ', ';
      user += t.handle;
      c = true;
    }
    if (s.author.participantType === "VIRTUAL") user += ' #';
    if (s.author.participationType === "OUT_OF_COMPETITION") user += " *";
    if (!users[user]) users[user] = [];
    users[user].push(x);
  }

  for (const [user, subs] of Object.entries(users)) {
    const x = new Contestant();
    x.handle = user;
    x.subs = subs.sort((a, b) => a.time - b.time);
    x.type = x.handle[x.handle.length - 1] === '#' ? "VIRTUAL" :
      x.handle[x.handle.length - 1] === '*' ? "OUT_OF_COMPETITION" : "CONTESTANT";
    x.contest = contest;
    c.push(x);
  }
}


function getScores(minutes, virtual_status, unofficial_status) {
  const time = minutes * 60;

  let output = `<h2>${contest.name}</h2>\n`;
  output += `<h3>${time / 60} minutes in</h3>\n`;
  output += `<style>th {width:150px;text-align:left}</style>\n`;

  c.forEach(cc => cc.calc(time));
  c.sort((a, b) => b.score - a.score);
  const headers = ["Handle", "Score", ...contest.problems];

  output += "<table>\n";

  output += "<tr>\n";
  headers.forEach(i => {
    output += `<th>${i}</th>\n`;
  });
  output += "</tr>\n";

  for (let i = 0; i < 100; i++) {
    const cc = c[i];
    if (cc.type == "VIRTUAL" && virtual_status === false) continue;
    if (cc.type == "OUT_OF_COMPETITION" && unofficial_status === false) continue;

    output += "<tr>\n";
    output += `<td>${cc.handle}</td>\n`;
    output += `<td>${cc.score}</td>\n`;
    cc.ranking.forEach(sc => {
      output += `<td>${sc}</td>\n`;
    });
    output += "</tr>\n";
  }

  output += "</table>\n";
  document.getElementById('body').innerHTML = output;
}


async function go() {
  let new_contest_id = Number(document.getElementById("contest_id").value);
  let new_time = Number(document.getElementById("minute").value);
  let virtual_status = document.getElementById("virtual").checked;
  let unofficial_status = document.getElementById("unofficial").checked;

  if (new_contest_id !== prev_contest_id) {
    document.getElementById('body').innerHTML = "<label>Waiting...</label>";
    contest = new Contest();
    c = [];
    await getContest(new_contest_id);
    await getSubmissions(new_contest_id);
    prev_contest_id = new_contest_id;
  }
  getScores(new_time, virtual_status, unofficial_status);
}
