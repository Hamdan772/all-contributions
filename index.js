import { writeFile } from "node:fs/promises";
import moment from "moment";
import simpleGit from "simple-git";
import random from "random";

const DATA_FILE = "./data.json";
const DEFAULT_COUNT = 100;
const EARLIEST_DATE = moment("2021-01-01").startOf("day");

const countArg = Number.parseInt(process.argv[2] || "", 10);
const commitCount = Number.isFinite(countArg) && countArg > 0 ? countArg : DEFAULT_COUNT;

const randomPastDate = () => {
  const now = moment();
  const totalSeconds = now.diff(EARLIEST_DATE, "seconds");

  if (totalSeconds <= 0) {
    return EARLIEST_DATE.toISOString();
  }

  const offsetSeconds = random.int(0, totalSeconds);
  return EARLIEST_DATE.clone().add(offsetSeconds, "seconds").toISOString();
};

const makeCommits = async (count) => {
  const git = simpleGit();

  for (let i = 0; i < count; i += 1) {
    const date = randomPastDate();
    await writeFile(DATA_FILE, JSON.stringify({ date }), "utf8");

    // Set both author and committer dates so GitHub counts them correctly.
    await git
      .env({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
      .add([DATA_FILE]);

    await git
      .env({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
      .commit(`chore: backdated commit ${i + 1}`, [DATA_FILE], { "--date": date });

    console.log(`created ${i + 1}/${count}: ${date}`);
  }

  const remotes = await git.getRemotes(true);
  const hasOrigin = remotes.some((remote) => remote.name === "origin");

  if (!hasOrigin) {
    console.log("No origin remote found. Commits are created locally only.");
    return;
  }

  const currentBranch = (await git.revparse(["--abbrev-ref", "HEAD"]))?.trim() || "main";
  await git.push("origin", currentBranch);
  console.log(`Pushed commits to origin/${currentBranch}`);
};

makeCommits(commitCount).catch((error) => {
  console.error("Failed to create backdated commits:", error.message);
  process.exitCode = 1;
});
