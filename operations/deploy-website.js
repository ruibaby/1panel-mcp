import fs from "fs-extra";
import OnePanelAPI from "../1panel-api.mjs";

export async function deployWebsite(buildDirPath, domain = "") {
  if (!fs.existsSync(buildDirPath)) {
    return {
      content: [
        {
          type: "text",
          text: `Build directory ${buildDir} does not exist`,
        },
      ],
      isError: true,
    };
  }

  console.log(`Start deploying directory ${buildDirPath} to 1Panel`);

  const onePanelAPI = new OnePanelAPI({
    baseURL: process.env.ONEPANEL_BASE_URL,
    apiKey: process.env.ONEPANEL_API_KEY,
    languageCode: process.env.ONEPANEL_LANGUAGE || "zh",
  });

  const siteConfig = {
    domain: domain,
  };

  let website = await onePanelAPI.getWebsiteDetail(domain);

  if (!website) {
    website = await onePanelAPI.createWebsite(siteConfig);
    console.log(`Create website: domain: ${domain}`);
  } else {
    console.log(`Website already exists: domain: ${domain}`);
  }

  console.log("Upload files to website");

  const uploadResult = await onePanelAPI.uploadStaticFiles(
    domain,
    buildDirPath
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            domain: domain,
            url: `http://${domain}`,
            status: "success",
            uploadStats: {
              totalFiles: uploadResult.totalFiles,
              successCount: uploadResult.successCount,
              failCount: uploadResult.failCount,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
