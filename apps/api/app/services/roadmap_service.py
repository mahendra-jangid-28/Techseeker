from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.roadmap import (
    Roadmap,
    RoadmapModule,
    UserRoadmapProgress,
    UserRoadmapSelection,
)
from app.schemas.roadmap import (
    ModuleItemResponse,
    RoadmapSummaryResponse,
    UserRoadmapDetailResponse,
)
from app.services.progress_service import award_xp
from app.services.memory_service import (
    normalize_topic_key,
    upsert_user_memory,
)


DEFAULT_ROADMAPS_DATA = [
    {
        "title": "AI Engineer",
        "difficulty": "Advanced",
        "estimated_weeks": 16,
        "description": "Master modern AI, Deep Learning architectures, PyTorch, Large Language Models, and production MLOps.",
        "modules": [
            {"title": "Python for AI & Numerical Computing", "description": "NumPy, Vectorization, Matrix Algebra, and high-performance Python.", "order_index": 1, "estimated_hours": 15},
            {"title": "Linear Algebra, Calculus & Statistics", "description": "Gradients, Probability distributions, Eigenvectors, and Loss optimization.", "order_index": 2, "estimated_hours": 20},
            {"title": "Classical Machine Learning with Scikit-Learn", "description": "Regression, Decision Trees, Ensembles, PCA, and Cross-Validation.", "order_index": 3, "estimated_hours": 25},
            {"title": "Deep Learning & Neural Networks with PyTorch", "description": "Tensors, Backpropagation, CNNs, RNNs, and custom training loops.", "order_index": 4, "estimated_hours": 35},
            {"title": "NLP, Transformers & LLM Architectures", "description": "Self-Attention, BERT, GPT, Prompt Engineering, and LoRA Fine-Tuning.", "order_index": 5, "estimated_hours": 40},
            {"title": "Vector Databases, RAG & MLOps Deployment", "description": "Chroma/Pinecone, LangChain, FastAPI inference engines, and Model monitoring.", "order_index": 6, "estimated_hours": 30},
        ],
    },
    {
        "title": "Full Stack Developer",
        "difficulty": "Intermediate",
        "estimated_weeks": 14,
        "description": "Build end-to-end modern web applications with React, Next.js, FastAPI, Node.js, PostgreSQL, and Cloud Deployment.",
        "modules": [
            {"title": "Modern TypeScript & Advanced JavaScript", "description": "Generics, Async/Await, Closures, DOM Architecture, and ESNext features.", "order_index": 1, "estimated_hours": 15},
            {"title": "React 19 & Next.js App Router Architecture", "description": "Server Components, Hooks, State Management, and Tailwind CSS design systems.", "order_index": 2, "estimated_hours": 30},
            {"title": "Backend Services with FastAPI & Node.js", "description": "RESTful API design, Middleware, Async request handlers, and Data validation.", "order_index": 3, "estimated_hours": 25},
            {"title": "PostgreSQL, SQLAlchemy & Relational Data Modeling", "description": "ACID Transactions, Migrations, Indexing, and Complex Joins.", "order_index": 4, "estimated_hours": 20},
            {"title": "Authentication, OAuth2 & JWT Security", "description": "Secure password hashing, Session management, CORS, and RBAC authorization.", "order_index": 5, "estimated_hours": 15},
            {"title": "Docker Containers, CI/CD & Cloud Deployment", "description": "Multi-stage Docker builds, GitHub Actions, NGINX reverse proxy, and AWS deployment.", "order_index": 6, "estimated_hours": 20},
        ],
    },
    {
        "title": "Data Analyst",
        "difficulty": "Beginner",
        "estimated_weeks": 10,
        "description": "Turn raw data into actionable insights with SQL, Python, Pandas, Tableau, and Business Intelligence analysis.",
        "modules": [
            {"title": "Advanced Excel & Statistical Modeling", "description": "Pivot tables, VLOOKUP/XLOOKUP, Hypothesis testing, and Descriptive analytics.", "order_index": 1, "estimated_hours": 15},
            {"title": "SQL for Analytics & Complex Querying", "description": "Aggregate functions, Window functions, Subqueries, CTEs, and Group By optimization.", "order_index": 2, "estimated_hours": 20},
            {"title": "Python for Data Analysis with Pandas & NumPy", "description": "Data wrangling, Cleaning missing values, Merging datasets, and Data filtering.", "order_index": 3, "estimated_hours": 25},
            {"title": "Interactive Dashboards with Tableau & Power BI", "description": "Visual hierarchy, DAX formulas, Custom metrics, and Executive reporting.", "order_index": 4, "estimated_hours": 20},
            {"title": "Exploratory Data Analysis (EDA) & Storytelling", "description": "Correlation analysis, Matplotlib/Seaborn visualizations, and Actionable takeaways.", "order_index": 5, "estimated_hours": 25},
            {"title": "End-to-End Business Case Capstone", "description": "Real-world sales & churn analysis project with business recommendations.", "order_index": 6, "estimated_hours": 20},
        ],
    },
    {
        "title": "Android Developer",
        "difficulty": "Intermediate",
        "estimated_weeks": 12,
        "description": "Develop high-performance native Android apps using Kotlin, Jetpack Compose, Coroutines, and Clean Architecture.",
        "modules": [
            {"title": "Kotlin Programming Essentials", "description": "Null safety, Lambdas, Extension functions, Coroutines basics, and Collections.", "order_index": 1, "estimated_hours": 15},
            {"title": "Modern UI with Jetpack Compose", "description": "Declarative layouts, State hoisting, Modifiers, Animations, and Material Design 3.", "order_index": 2, "estimated_hours": 30},
            {"title": "Android Architecture Components & ViewModel", "description": "MVVM architecture, Navigation component, LiveData, and StateFlow.", "order_index": 3, "estimated_hours": 25},
            {"title": "Local Storage with Room Database & DataStore", "description": "Entities, DAOs, TypeConverters, Offline caching, and Preferences.", "order_index": 4, "estimated_hours": 20},
            {"title": "REST API Integration with Retrofit & OkHttp", "description": "JSON parsing with Moshi/Gson, Dependency injection with Hilt, and Error handling.", "order_index": 5, "estimated_hours": 20},
            {"title": "App Optimization, Testing & Play Store Release", "description": "Unit testing, ProGuard rules, App bundles, and Google Play Console deployment.", "order_index": 6, "estimated_hours": 15},
        ],
    },
    {
        "title": "Cyber Security",
        "difficulty": "Advanced",
        "estimated_weeks": 14,
        "description": "Protect systems, identify web vulnerabilities, master ethical hacking methodologies, and defend enterprise infrastructure.",
        "modules": [
            {"title": "Networking Fundamentals & Protocol Analysis", "description": "OSI model, TCP/IP handshake, DNS, Wireshark packet capture, and Subnetting.", "order_index": 1, "estimated_hours": 20},
            {"title": "Linux Security & Bash Automation", "description": "File permissions, SSH hardening, iptables firewall, and Security shell scripting.", "order_index": 2, "estimated_hours": 25},
            {"title": "Applied Cryptography & PKI Infrastructure", "description": "Symmetric vs Asymmetric encryption, Hashing, TLS certificates, and Digital signatures.", "order_index": 3, "estimated_hours": 20},
            {"title": "Web Application Security & OWASP Top 10", "description": "SQL Injection, XSS, CSRF, SSRF, Broken Access Control, and Burp Suite analysis.", "order_index": 4, "estimated_hours": 30},
            {"title": "Ethical Hacking & Penetration Testing", "description": "Nmap network scanning, Metasploit, Privilege escalation, and Vulnerability assessments.", "order_index": 5, "estimated_hours": 35},
            {"title": "SOC Operations, SIEM & Threat Hunting", "description": "Log analysis with Splunk/ELK, Incident response lifecycle, and Malware triage.", "order_index": 6, "estimated_hours": 25},
        ],
    },
    {
        "title": "DevOps Engineer",
        "difficulty": "Intermediate",
        "estimated_weeks": 12,
        "description": "Automate infrastructure, configure enterprise CI/CD pipelines, orchestrate Kubernetes clusters, and manage Cloud platforms.",
        "modules": [
            {"title": "Linux Server Administration & Shell Scripting", "description": "Process management, Systemd services, Cron jobs, and Bash automation.", "order_index": 1, "estimated_hours": 15},
            {"title": "Git Workflows & Automated CI/CD Pipelines", "description": "GitHub Actions, Branch protection rules, Automated testing, and Artifact publishing.", "order_index": 2, "estimated_hours": 20},
            {"title": "Docker Containers & Microservices Strategy", "description": "Dockerfile optimization, Multi-stage builds, Docker Compose, and Container networking.", "order_index": 3, "estimated_hours": 25},
            {"title": "Kubernetes Cluster Management & Helm Charts", "description": "Pods, Deployments, Services, Ingress controllers, ConfigMaps, and Helm releases.", "order_index": 4, "estimated_hours": 35},
            {"title": "Infrastructure as Code (IaC) with Terraform", "description": "HCL syntax, State management, Cloud resource provisioning on AWS/GCP.", "order_index": 5, "estimated_hours": 25},
            {"title": "Observability, Monitoring & SRE Practices", "description": "Prometheus metrics, Grafana dashboards, Centralized logging, and SLA/SLO management.", "order_index": 6, "estimated_hours": 20},
        ],
    },
]


def seed_default_roadmaps(db: Session) -> None:
    for r_data in DEFAULT_ROADMAPS_DATA:
        existing = db.query(Roadmap).filter(Roadmap.title == r_data["title"]).first()
        if not existing:
            roadmap = Roadmap(
                title=r_data["title"],
                description=r_data["description"],
                difficulty=r_data["difficulty"],
                estimated_weeks=r_data["estimated_weeks"],
            )
            db.add(roadmap)
            db.commit()
            db.refresh(roadmap)

            for m_data in r_data["modules"]:
                module = RoadmapModule(
                    roadmap_id=roadmap.id,
                    title=m_data["title"],
                    description=m_data["description"],
                    order_index=m_data["order_index"],
                    estimated_hours=m_data["estimated_hours"],
                )
                db.add(module)
            db.commit()


def get_all_roadmaps(db: Session) -> List[RoadmapSummaryResponse]:
    seed_default_roadmaps(db)
    roadmaps = db.query(Roadmap).order_by(Roadmap.id).all()
    
    return [
        RoadmapSummaryResponse(
            id=r.id,
            title=r.title,
            description=r.description,
            difficulty=r.difficulty,
            estimated_weeks=r.estimated_weeks,
            total_modules=len(r.modules),
        )
        for r in roadmaps
    ]


def calculate_progress(completed_count: int, total_count: int) -> int:
    if total_count <= 0:
        return 0
    return round((completed_count / total_count) * 100)


def get_user_roadmap(db: Session, user_id: int) -> Optional[UserRoadmapDetailResponse]:
    seed_default_roadmaps(db)
    selection = (
        db.query(UserRoadmapSelection)
        .filter(UserRoadmapSelection.user_id == user_id)
        .first()
    )
    if not selection:
        return None

    roadmap = db.query(Roadmap).filter(Roadmap.id == selection.roadmap_id).first()
    if not roadmap:
        return None

    # Get user progress for modules
    progress_records = (
        db.query(UserRoadmapProgress)
        .filter(
            UserRoadmapProgress.user_id == user_id,
            UserRoadmapProgress.roadmap_id == roadmap.id,
        )
        .all()
    )
    progress_map = {p.module_id: p.status for p in progress_records}

    modules_response: List[ModuleItemResponse] = []
    completed_count = 0

    for idx, module in enumerate(roadmap.modules):
        status = progress_map.get(module.id)
        if not status:
            # First module unlocks by default if uninitialized
            status = "unlocked" if idx == 0 else "locked"

        if status == "completed":
            completed_count += 1

        modules_response.append(
            ModuleItemResponse(
                id=module.id,
                roadmap_id=module.roadmap_id,
                title=module.title,
                description=module.description,
                order_index=module.order_index,
                estimated_hours=module.estimated_hours,
                status=status,
            )
        )

    total_count = len(roadmap.modules)
    progress_pct = calculate_progress(completed_count, total_count)

    return UserRoadmapDetailResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        difficulty=roadmap.difficulty,
        estimated_weeks=roadmap.estimated_weeks,
        progress_percentage=progress_pct,
        completed_modules_count=completed_count,
        total_modules_count=total_count,
        modules=modules_response,
    )


def select_roadmap(db: Session, user_id: int, roadmap_id: int) -> UserRoadmapDetailResponse:
    seed_default_roadmaps(db)
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    selection = (
        db.query(UserRoadmapSelection)
        .filter(UserRoadmapSelection.user_id == user_id)
        .first()
    )
    if selection:
        selection.roadmap_id = roadmap_id
    else:
        selection = UserRoadmapSelection(
            user_id=user_id,
            roadmap_id=roadmap_id,
        )
        db.add(selection)
    db.commit()

    # Initialize progress for roadmap modules if missing
    for idx, module in enumerate(roadmap.modules):
        existing_progress = (
            db.query(UserRoadmapProgress)
            .filter(
                UserRoadmapProgress.user_id == user_id,
                UserRoadmapProgress.module_id == module.id,
            )
            .first()
        )
        if not existing_progress:
            init_status = "unlocked" if idx == 0 else "locked"
            new_prog = UserRoadmapProgress(
                user_id=user_id,
                roadmap_id=roadmap.id,
                module_id=module.id,
                status=init_status,
            )
            db.add(new_prog)
    db.commit()

    detail = get_user_roadmap(db, user_id)
    if not detail:
        raise HTTPException(status_code=500, detail="Failed to initialize user roadmap")

    # Record durable learning goal
    upsert_user_memory(
        db,
        user_id=user_id,
        memory_key="selected_roadmap",
        memory_value=f"Enrolled in {roadmap.title} roadmap ({roadmap.difficulty})",
        memory_type="current_goal",
        importance=3,
    )

    return detail


def complete_module(db: Session, user_id: int, module_id: int) -> UserRoadmapDetailResponse:
    module = db.query(RoadmapModule).filter(RoadmapModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    progress = (
        db.query(UserRoadmapProgress)
        .filter(
            UserRoadmapProgress.user_id == user_id,
            UserRoadmapProgress.module_id == module_id,
        )
        .first()
    )

    if not progress:
        progress = UserRoadmapProgress(
            user_id=user_id,
            roadmap_id=module.roadmap_id,
            module_id=module_id,
            status="completed",
            completed_at=datetime.now(timezone.utc),
        )
        db.add(progress)
    else:
        progress.status = "completed"
        progress.completed_at = datetime.now(timezone.utc)
    db.commit()

    # Unlock next module in order
    next_module = (
        db.query(RoadmapModule)
        .filter(
            RoadmapModule.roadmap_id == module.roadmap_id,
            RoadmapModule.order_index == module.order_index + 1,
        )
        .first()
    )
    if next_module:
        next_progress = (
            db.query(UserRoadmapProgress)
            .filter(
                UserRoadmapProgress.user_id == user_id,
                UserRoadmapProgress.module_id == next_module.id,
            )
            .first()
        )
        if not next_progress:
            next_prog = UserRoadmapProgress(
                user_id=user_id,
                roadmap_id=module.roadmap_id,
                module_id=next_module.id,
                status="unlocked",
            )
            db.add(next_prog)
        elif next_progress.status == "locked":
            next_progress.status = "unlocked"
        db.commit()

    # Award +25 XP and log activity
    award_xp(
        db,
        user_id=user_id,
        activity_type="roadmap_module_completed",
        activity_title=f"Completed: {module.title}",
        xp_amount=25,
    )

    # Record durable memory of completed module
    norm_key = normalize_topic_key(module.title)
    upsert_user_memory(
        db,
        user_id=user_id,
        memory_key=f"completed_topic:{norm_key}",
        memory_value=f"Completed module: {module.title}",
        memory_type="completed_topic",
        importance=2,
    )
    upsert_user_memory(
        db,
        user_id=user_id,
        memory_key="recent_learning_context",
        memory_value=f"Completed roadmap module: {module.title}",
        memory_type="recent_learning_context",
        importance=1,
    )

    detail = get_user_roadmap(db, user_id)
    if not detail:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated roadmap")
    return detail

