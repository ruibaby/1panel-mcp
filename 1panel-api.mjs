import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import fs from "fs-extra";
import path from "path";

class OnePanelAPI {
  constructor(config) {
    this.baseURL = `${config.baseURL}/api/v1`;
    this.apiKey = config.apiKey;
    this.languageCode = config.languageCode || "zh";
  }

  getAuthHeaders() {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const content = `1panel${this.apiKey}${timestamp}`;
    const token = crypto.createHash("md5").update(content).digest("hex");

    return {
      "1Panel-Token": token,
      "1Panel-Timestamp": timestamp,
      "Accept-Language": this.languageCode,
    };
  }

  async createWebsite(siteConfig) {
    try {
      const headers = this.getAuthHeaders();

      const requestBody = {
        primaryDomain: siteConfig.domain,
        type: "static",
        alias: siteConfig.domain,
        remark: "",
        appType: "installed",
        webSiteGroupId: 2,
        otherDomains: "",
        proxy: "",
        appinstall: {
          appId: 0,
          name: "",
          appDetailId: 0,
          params: {},
          version: "",
          appkey: "",
          advanced: false,
          cpuQuota: 0,
          memoryLimit: 0,
          memoryUnit: "MB",
          containerName: "",
          allowPort: false,
        },
        IPV6: false,
        enableFtp: false,
        ftpUser: "",
        ftpPassword: "",
        proxyType: "tcp",
        port: 9000,
        proxyProtocol: "http://",
        proxyAddress: "",
        runtimeType: "php",
      };

      const response = await axios.post(
        `${this.baseURL}/websites`,
        requestBody,
        { headers }
      );

      const website = await this.getWebsiteDetail(siteConfig.domain);
      return website;
    } catch (error) {
      throw new Error(`Create website failed: ${error.message}`);
    }
  }

  async getWebsiteDetail(domain) {
    try {
      const headers = this.getAuthHeaders();

      const { data } = await axios.post(
        `${this.baseURL}/websites/search`,
        {
          name: "",
          page: 1,
          pageSize: 10,
          orderBy: "created_at",
          order: "null",
          websiteGroupId: 0,
        },
        {
          headers,
        }
      );

      const websites = data.data.items;

      const website = websites.find((w) => w.primaryDomain === domain);

      return website;
    } catch (error) {
      console.error("Get website detail failed:", error);
      throw new Error(`Get website detail failed: ${error.message}`);
    }
  }

  async uploadSingleFile(filePath, targetDir) {
    try {
      const formData = new FormData();

      formData.append("file", fs.createReadStream(filePath));
      formData.append("path", targetDir);
      formData.append("overwrite", "True");
      const headers = this.getAuthHeaders();

      const response = await axios.post(
        `${this.baseURL}/files/upload`,
        formData,
        {
          headers: {
            ...headers,
            ...formData.getHeaders(),
          },
        }
      );

      return response.data.data || { message: "Upload success" };
    } catch (error) {
      console.error(`Upload file failed: ${filePath}`, error);
      throw new Error(`Upload file failed: ${filePath} - ${error.message}`);
    }
  }

  async uploadDirectory(sourceDir, targetDir, basePath) {
    if (!targetDir.endsWith("/")) {
      targetDir += "/";
    }

    basePath = basePath || sourceDir;

    const results = [];
    const files = await fs.readdir(sourceDir);

    console.log(
      `Start uploading directory ${sourceDir} to ${targetDir}, ${files.length} files/directories`
    );

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const stats = await fs.stat(sourcePath);

      if (stats.isDirectory()) {
        console.log(`Found subdirectory: ${file}, uploading recursively...`);
        const subResults = await this.uploadDirectory(
          sourcePath,
          targetDir,
          basePath
        );
        results.push(...subResults);
      } else {
        const relativePath = path.relative(basePath, sourceDir);

        let uploadTargetDir = targetDir;
        if (relativePath) {
          uploadTargetDir = path.join(targetDir, relativePath);
        }

        console.log(`Upload file: ${file} to directory ${uploadTargetDir}`);
        try {
          const result = await this.uploadSingleFile(
            sourcePath,
            uploadTargetDir
          );
          results.push({ file, result, success: true });
        } catch (error) {
          console.error(`Upload file ${file} failed:`, error.message);
          results.push({ file, error: error.message, success: false });
        }
      }
    }

    return results;
  }

  async uploadStaticFiles(domain, sourceDirPath) {
    try {
      const siteDetail = await this.getWebsiteDetail(domain);

      if (!siteDetail.sitePath) {
        throw new Error("Cannot get website physical path");
      }

      const sitePath = siteDetail.sitePath;
      console.log(`Website physical path: ${sitePath}`);

      if (!fs.existsSync(sourceDirPath)) {
        throw new Error(`Source directory does not exist: ${sourceDirPath}`);
      }

      const targetPath = path.join(sitePath, "index");
      console.log(
        `Start uploading directory ${sourceDirPath} to website directory ${targetPath}`
      );
      const results = await this.uploadDirectory(
        sourceDirPath,
        targetPath,
        sourceDirPath
      );

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      console.log(
        `Upload completed: ${results.length} files, ${successCount} success, ${failCount} failed`
      );

      return {
        totalFiles: results.length,
        successCount,
        failCount,
        details: results,
      };
    } catch (error) {
      console.error("Upload file failed:", error);
      throw new Error(`Upload file failed: ${error.message}`);
    }
  }
}

export default OnePanelAPI;
