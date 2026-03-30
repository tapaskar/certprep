import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sparkupcloud.com";

  const certifications = [
    { code: "clf-c02", name: "cloud-practitioner" },
    { code: "aif-c01", name: "ai-practitioner" },
    { code: "saa-c03", name: "solutions-architect-associate" },
    { code: "dva-c02", name: "developer-associate" },
    { code: "soa-c02", name: "sysops-administrator" },
    { code: "dea-c01", name: "data-engineer" },
    { code: "mla-c01", name: "ml-engineer" },
    { code: "sap-c02", name: "solutions-architect-professional" },
    { code: "dop-c02", name: "devops-engineer-professional" },
    { code: "aip-c01", name: "genai-developer-professional" },
    { code: "scs-c02", name: "security-specialty" },
    { code: "dbs-c01", name: "database-specialty" },
    { code: "ans-c01", name: "advanced-networking-specialty" },
    { code: "mls-c01", name: "machine-learning-specialty" },
  ];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
