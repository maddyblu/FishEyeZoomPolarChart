import { AccessiblePolarChartItem } from "../types";

export interface DatasetPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  items: AccessiblePolarChartItem[];
}

export const SAMPLE_DATASETS: DatasetPreset[] = [
  {
    id: "dense-skills",
    name: "Engineering & AI Competencies (28 Dense Points)",
    category: "Talent & Skills Intelligence",
    description: "High-density radar dataset representing 28 candidate engineering capabilities with syntactic and semantic variations.",
    items: [
      { label: "React / Next.js", value: 95, recency: 12, category: "Frontend" },
      { label: "TypeScript", value: 92, recency: 8, category: "Frontend" },
      { label: "Tailwind CSS", value: 88, recency: 15, category: "Frontend" },
      { 
        label: "Python / GenAI", 
        value: 85, 
        recency: 5, 
        category: "AI/ML", 
        isVariant: true, 
        variantType: "both",
        synMatch: "Python 3.12 / LLM Pipelines",
        semMatch: "Prompt Engineering & RAG Architectures"
      },
      { 
        label: "PyTorch & Transformers", 
        value: 78, 
        recency: 18, 
        category: "AI/ML",
        isVariant: true,
        variantType: "sem",
        semMatch: "Deep Learning Tensor Models"
      },
      { label: "Node.js Express", value: 82, recency: 25, category: "Backend" },
      { label: "PostgreSQL & SQL", value: 76, recency: 32, category: "Database" },
      { 
        label: "GraphQL APIs", 
        value: 70, 
        recency: 42, 
        category: "Backend",
        isVariant: true,
        variantType: "syn",
        synMatch: "Apollo GraphQL Client/Server"
      },
      { label: "Docker & OCI", value: 84, recency: 10, category: "DevOps" },
      { label: "Kubernetes", value: 65, recency: 38, category: "DevOps" },
      { 
        label: "AWS Cloud Arch", 
        value: 79, 
        recency: 22, 
        category: "Cloud",
        isVariant: true,
        variantType: "both",
        synMatch: "Amazon Web Services (ECS, Lambda)",
        semMatch: "Serverless Microservice Patterns"
      },
      { label: "GCP Cloud Run", value: 88, recency: 6, category: "Cloud" },
      { label: "Redis Caching", value: 68, recency: 45, category: "Database" },
      { label: "Vector DB (Pinecone)", value: 74, recency: 4, category: "AI/ML" },
      { label: "LangChain / LlamaIndex", value: 80, recency: 3, category: "AI/ML" },
      { label: "CI/CD GitHub Actions", value: 86, recency: 14, category: "DevOps" },
      { label: "Terraform IaC", value: 62, recency: 55, category: "DevOps" },
      { label: "Jest & Vitest", value: 72, recency: 28, category: "Testing" },
      { label: "Playwright E2E", value: 69, recency: 20, category: "Testing" },
      { label: "WebSockets / RTC", value: 64, recency: 62, category: "Backend" },
      { 
        label: "Kafka Streaming", 
        value: 58, 
        recency: -1, 
        category: "Data",
        description: "Specialized enterprise event pipeline experience flagged as legacy exception."
      },
      { label: "Rust Systems", value: 52, recency: 75, category: "Systems" },
      { label: "WebAssembly", value: 48, recency: 82, category: "Frontend" },
      { label: "Accessibility (WCAG)", value: 90, recency: 11, category: "Frontend" },
      { label: "Security & OWASP", value: 75, recency: 30, category: "Security" },
      { label: "OAuth2 / OIDC", value: 83, recency: 16, category: "Security" },
      { label: "System Design", value: 91, recency: 9, category: "Architecture" },
      { label: "Data Structures", value: 87, recency: 88, category: "Core CS" },
    ]
  },
  {
    id: "cloud-reliability",
    name: "Multi-Cloud Reliability & Metrics (20 Sectors)",
    category: "Infrastructure Telemetry",
    description: "SRE health and latency profile across critical cloud service nodes.",
    items: [
      { label: "Ingress Gateway", value: 99, recency: 2, category: "Network" },
      { label: "Auth Middleware", value: 94, recency: 5, category: "Security" },
      { label: "API Edge Cache", value: 88, recency: 12, category: "Performance" },
      { label: "Core Compute Node", value: 92, recency: 4, category: "Compute" },
      { label: "Worker Cluster A", value: 85, recency: 19, category: "Compute" },
      { label: "Worker Cluster B", value: 79, recency: 28, category: "Compute" },
      { label: "Event Queue Main", value: 96, recency: 1, category: "Messaging" },
      { label: "Dead Letter Queue", value: 42, recency: 65, category: "Messaging" },
      { label: "Primary Postgres", value: 97, recency: 3, category: "Storage" },
      { label: "Read Replicas", value: 91, recency: 14, category: "Storage" },
      { label: "Blob Object Storage", value: 89, recency: 8, category: "Storage" },
      { label: "Vector Search Node", value: 84, recency: 7, category: "AI/ML" },
      { label: "Metric Scraper", value: 90, recency: 11, category: "Observability" },
      { label: "Log Collector", value: 87, recency: 16, category: "Observability" },
      { label: "Trace Processor", value: 81, recency: 24, category: "Observability" },
      { label: "Audit Log Vault", value: 95, recency: -1, category: "Compliance" },
      { label: "Key Vault HSM", value: 98, recency: 6, category: "Security" },
      { label: "Rate Limiter", value: 93, recency: 9, category: "Security" },
      { label: "DNS Anycast", value: 99, recency: 1, category: "Network" },
      { label: "CDN Global Edge", value: 96, recency: 3, category: "Network" }
    ]
  },
  {
    id: "energy-sources",
    name: "Global Clean Grid Production (14 Categories)",
    category: "Sustainability",
    description: "Grid capacity distribution across sustainable energy sectors.",
    items: [
      { label: "Offshore Wind", value: 86, recency: 8, category: "Wind" },
      { label: "Onshore Wind", value: 94, recency: 15, category: "Wind" },
      { label: "Utility Solar PV", value: 98, recency: 4, category: "Solar" },
      { label: "Rooftop Solar", value: 82, recency: 18, category: "Solar" },
      { label: "Hydroelectric", value: 90, recency: 72, category: "Hydro" },
      { label: "Pumped Storage", value: 74, recency: 48, category: "Hydro" },
      { label: "Geothermal Power", value: 68, recency: 35, category: "Thermal" },
      { label: "Battery Storage", value: 89, recency: 2, category: "Storage" },
      { label: "Green Hydrogen", value: 61, recency: 10, category: "Hydrogen" },
      { label: "Biomass Cogeneration", value: 55, recency: 58, category: "Bio" },
      { label: "Tidal & Wave", value: 44, recency: -1, category: "Marine" },
      { label: "Nuclear SMR", value: 71, recency: 12, category: "Nuclear" },
      { label: "Grid Synchronizers", value: 85, recency: 22, category: "Grid" },
      { label: "Demand Response", value: 79, recency: 14, category: "Grid" }
    ]
  }
];
