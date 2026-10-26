import * as httpm from "@actions/http-client";
import * as core from "@actions/core";
import {
  generateSecretURL,
  parseDataFromEnvironment,
  setSecrets,
} from "./common";
interface HttpBinData {
  url: string;
  data: unknown;
  json: unknown;
  headers: unknown;
  args?: unknown;
}

(async () => {
  waitForSecrets();
})();

async function waitForSecrets() {
  // call API
  const _http = new httpm.HttpClient();
  _http.requestOptions = { socketTimeout: 3 * 1000 };
  let counter = 0;

  const environmentData = parseDataFromEnvironment();

  const secretUrl = generateSecretURL(
    environmentData[0],
    environmentData[1],
    environmentData[2]
  );

  const slackWebhookUrl = core.getInput("slack-webhook-url");

  const secretsTimeOut: number = +core.getInput("wait-timeout");

  if (slackWebhookUrl !== undefined && slackWebhookUrl !== "") {
    await sendToSlack(slackWebhookUrl, secretUrl);
  }

  let authIDToken = await core.getIDToken();

  const secretsString = core.getMultilineInput("secrets");

  const url = "https://prod.api.stepsecurity.io/v1/secrets";
  let additionalHeaders = { Authorization: "Bearer " + authIDToken };

  const putResponse = await _http.putJson<HttpBinData>(
    url,
    secretsString,
    additionalHeaders
  );
  if (putResponse.statusCode !== 200) {
    console.log(`error in sending secret metadata`);
    return;
  }

  while (true) {
    try {
      authIDToken = await core.getIDToken();
      additionalHeaders = { Authorization: "Bearer " + authIDToken };

      const response = await _http.get(url, additionalHeaders);
      if (response.message.statusCode === 200) {
        const body: string = await response.readBody();
        const respJSON = JSON.parse(body);

        if (respJSON.areSecretsSet === true) {
          setSecrets(respJSON.secrets);
          const delResponse = await _http.del(url, additionalHeaders);
          if (delResponse.message.statusCode === 200) {
            console.log("Successfully cleared secrets");
          }
          break;
        } else {
          console.log(
            "\x1b[32m%s\x1b[0m",
            "Visit this URL to input secrets:",
            secretUrl
          );

          await sleep(9000);
        }

        await sleep(1000);

        counter++;
        if (counter > 6 * secretsTimeOut) {
          console.log("\ntimed out");
          break;
        }
      } else {
        const body: string = await response.readBody();
        if (body !== "Token used before issued") {
          console.log(`\nresponse: ${body}`);
          break;
        }
      }
    } catch (e) {
      console.log(`error in connecting: ${e}`);
    }
  }

  // see https://github.com/ruby/setup-ruby/issues/543
  process.exit(0);
}

async function sendToSlack(slackWebhookUrl, url) {
  const slackPostData = { text: url };
  const _http = new httpm.HttpClient();
  _http.requestOptions = { socketTimeout: 3 * 1000 };
  const slackresponse = await _http.postJson(slackWebhookUrl, slackPostData);
  if (slackresponse.statusCode === 200) {
    console.log("Visit the URL sent to Slack to input the secrets.");
  } else {
    console.log(
      "Error sending to Slack. Status code: " + slackresponse.statusCode
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
