#!/usr/bin/env python3
"""Generate seed data for the full Red Hat certification catalog.

Run from the backend dir:

    cd backend && python data/seed/_generate_redhat.py

For each exam in the master list below, this produces:

    data/seed/redhat-<slug>/
        exam.json        (Exam metadata + domains)
        exam_info.json   (Overview, tips, official resources)
        concepts.json    (Empty array — content TBD)
        questions.json   (Empty array — content TBD)

It also appends entries to learning-paths.json so the exams show up
as learning paths in the portfolio.

Re-running the script is safe: it overwrites the metadata files
(exam.json, exam_info.json) but leaves concepts.json + questions.json
alone if they already contain content (we only write empty stubs when
the file doesn't exist).
"""

import json
from pathlib import Path

# ── Master catalog of active Red Hat exams ──────────────────────────────
# Sources: official Red Hat training/certification catalog as of 2026.
# Domain weights are approximate — Red Hat publishes objectives but not
# always weights. Where weights aren't published we distribute evenly.

REDHAT_EXAMS = [
    # ── Foundation / Sysadmin track ────────────────────────────────
    {
        "id": "redhat-ex200",
        "code": "EX200",
        "name": "Red Hat Certified System Administrator (RHCSA)",
        "description": "Performance-based exam covering core RHEL 9 sysadmin skills: shell, file management, users/groups, storage, networking, services, SELinux, containers basics.",
        "total_questions": 0,                  # performance exam, no MCQs
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 3,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
        "track": "sysadmin",
        "performance_based": True,
        "domains": [
            ("understand-tools", "Understand and use essential tools", 15),
            ("create-config-systems", "Create simple shell scripts", 10),
            ("operate-running-systems", "Operate running systems", 12),
            ("config-storage", "Configure local storage", 13),
            ("create-config-fs", "Create and configure file systems", 12),
            ("deploy-config-services", "Deploy, configure and maintain systems", 13),
            ("manage-users-groups", "Manage users and groups", 8),
            ("manage-security", "Manage security (SELinux, firewall)", 12),
            ("manage-containers", "Manage containers (Podman)", 5),
        ],
    },
    {
        "id": "redhat-ex294",
        "code": "EX294",
        "name": "Red Hat Certified Engineer (RHCE) — Ansible Automation",
        "description": "Performance-based exam validating ability to automate RHEL system administration with Red Hat Ansible Automation Platform.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 70,
        "difficulty_rating": 4,
        "average_study_weeks": 10,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex294-red-hat-certified-engineer-rhce-exam-red-hat-enterprise-linux-8",
        "track": "sysadmin",
        "performance_based": True,
        "prerequisites": ["redhat-ex200"],
        "domains": [
            ("understand-ansible", "Understand core components of Ansible", 15),
            ("install-config-ansible", "Install and configure an Ansible control node", 10),
            ("configure-managed-nodes", "Configure Ansible managed nodes", 10),
            ("run-playbooks", "Run playbooks with automation content navigator", 15),
            ("create-playbooks", "Create Ansible plays and playbooks", 20),
            ("automate-standard-tasks", "Automate standard RHCSA tasks", 20),
            ("manage-content", "Manage content (roles, collections, AAP)", 10),
        ],
    },
    # ── OpenShift track ─────────────────────────────────────────────
    {
        "id": "redhat-ex180",
        "code": "EX180",
        "name": "Red Hat Specialist in Containers (Podman foundations)",
        "description": "Foundational performance exam on Podman, container images, registries, and pods on RHEL.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 2,
        "average_study_weeks": 4,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex188-red-hat-certified-specialist-containers-exam",
        "track": "containers",
        "performance_based": True,
        "domains": [
            ("manage-images", "Manage container images", 25),
            ("manage-containers", "Run and manage containers with Podman", 30),
            ("manage-storage", "Manage container storage (volumes, mounts)", 15),
            ("manage-networks", "Manage container networking", 15),
            ("build-images", "Build container images with Containerfile", 15),
        ],
    },
    {
        "id": "redhat-ex188",
        "code": "EX188",
        "name": "Red Hat Certified Specialist in Containers",
        "description": "Validates skills in building, running, and managing containers using Podman, Buildah, and Skopeo on RHEL — successor to EX180.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 3,
        "average_study_weeks": 5,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex188-red-hat-certified-specialist-containers-exam",
        "track": "containers",
        "performance_based": True,
        "domains": [
            ("understand-containers", "Understand and identify container concepts", 10),
            ("manage-images", "Manage container images with Skopeo and Podman", 20),
            ("build-images", "Build container images with Buildah and Containerfile", 20),
            ("run-containers", "Run, inspect, and manage containers", 25),
            ("manage-pods", "Manage container pods", 10),
            ("manage-storage-net", "Manage container storage and networks", 15),
        ],
    },
    {
        "id": "redhat-ex280",
        "code": "EX280",
        "name": "Red Hat Certified OpenShift Administrator",
        "description": "Performance-based exam validating skills to install, configure, and manage Red Hat OpenShift Container Platform clusters.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 10,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex280-red-hat-certified-specialist-openshift-administration-exam",
        "track": "openshift",
        "performance_based": True,
        "prerequisites": ["redhat-ex188"],
        "domains": [
            ("manage-cluster", "Manage an OpenShift cluster", 15),
            ("deploy-applications", "Deploy applications", 20),
            ("manage-storage", "Manage cluster storage", 12),
            ("manage-networking", "Configure networking components", 13),
            ("manage-security", "Manage authentication and authorization", 15),
            ("config-app-security", "Configure application security", 10),
            ("update-clusters", "Update clusters", 10),
            ("monitor-troubleshoot", "Monitor and troubleshoot the cluster", 5),
        ],
    },
    {
        "id": "redhat-ex288",
        "code": "EX288",
        "name": "Red Hat Certified Specialist in OpenShift Application Development",
        "description": "Validates skills to build and deploy cloud-native applications on OpenShift, including S2I, BuildConfigs, and Operator-based services.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex288-red-hat-certified-specialist-openshift-application-development-exam",
        "track": "openshift-dev",
        "performance_based": True,
        "domains": [
            ("design-build-images", "Design and build container images", 20),
            ("deploy-apps", "Deploy multi-container applications", 20),
            ("manage-builds", "Manage builds and BuildConfigs", 15),
            ("manage-deploy-config", "Manage deployments and rollouts", 15),
            ("integrate-services", "Integrate apps with backing services", 15),
            ("integrate-cicd", "Integrate with CI/CD pipelines", 15),
        ],
    },
    {
        "id": "redhat-ex316",
        "code": "EX316",
        "name": "Red Hat Certified Specialist in Containerized Application Development",
        "description": "Performance-based exam on building and managing containerized applications across the development lifecycle on OpenShift.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex316-red-hat-certified-specialist-containerized-application-development-exam",
        "track": "openshift-dev",
        "performance_based": True,
    },
    {
        "id": "redhat-ex318",
        "code": "EX318",
        "name": "Red Hat Certified Specialist in OpenShift Virtualization",
        "description": "Validates ability to deploy, configure, and manage virtual machines on Red Hat OpenShift Virtualization.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex318-red-hat-certified-specialist-openshift-virtualization-exam",
        "track": "openshift",
        "performance_based": True,
    },
    {
        "id": "redhat-ex328",
        "code": "EX328",
        "name": "Red Hat Certified Specialist in Building Resilient Microservices",
        "description": "Performance-based exam on building resilient microservices with Quarkus and Service Mesh on OpenShift.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 5,
        "average_study_weeks": 10,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex328-red-hat-certified-specialist-building-resilient-microservices-exam",
        "track": "openshift-dev",
        "performance_based": True,
    },
    {
        "id": "redhat-ex358",
        "code": "EX358",
        "name": "Red Hat Certified Specialist in Services Management and Automation",
        "description": "Performance exam on managing common system services in RHEL — DNS, web, mail, file sharing — and automating them with Ansible.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex358-red-hat-certified-specialist-services-management-and-automation-exam",
        "track": "sysadmin",
        "performance_based": True,
        "prerequisites": ["redhat-ex200"],
    },
    {
        "id": "redhat-ex362",
        "code": "EX362",
        "name": "Red Hat Certified Specialist in Identity Management",
        "description": "Validates skills to deploy and manage Red Hat Identity Management (IdM) for authentication, authorization, and policy enforcement.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex362-red-hat-certified-specialist-identity-management-exam",
        "track": "sysadmin",
        "performance_based": True,
    },
    {
        "id": "redhat-ex370",
        "code": "EX370",
        "name": "Red Hat Certified Specialist in OpenShift Data Foundation",
        "description": "Performance exam on deploying and managing Red Hat OpenShift Data Foundation for software-defined container storage.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 6,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex370-red-hat-certified-specialist-openshift-data-foundation-exam",
        "track": "openshift",
        "performance_based": True,
    },
    {
        "id": "redhat-ex374",
        "code": "EX374",
        "name": "Red Hat Certified Specialist in Ansible Automation Platform Development",
        "description": "Performance exam on developing automation content (collections, content navigator) and integrating with Red Hat Ansible Automation Platform.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 5,
        "average_study_weeks": 10,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex374-red-hat-certified-specialist-developing-automation-ansible-automation-platform-exam",
        "track": "ansible",
        "performance_based": True,
        "prerequisites": ["redhat-ex294"],
    },
    {
        "id": "redhat-ex380",
        "code": "EX380",
        "name": "Red Hat Certified Specialist in Multicluster Management",
        "description": "Performance exam on managing multiple OpenShift clusters with Red Hat Advanced Cluster Management (RHACM).",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 5,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex480-red-hat-certified-specialist-multicluster-management-exam",
        "track": "openshift",
        "performance_based": True,
        "prerequisites": ["redhat-ex280"],
    },
    {
        "id": "redhat-ex415",
        "code": "EX415",
        "name": "Red Hat Certified Specialist in Security: Linux",
        "description": "Performance exam on securing RHEL systems across physical, virtual, and cloud — SELinux, audit, OpenSCAP, network security.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex415-red-hat-certified-specialist-security-linux-exam",
        "track": "security",
        "performance_based": True,
        "prerequisites": ["redhat-ex200"],
    },
    {
        "id": "redhat-ex436",
        "code": "EX436",
        "name": "Red Hat Certified Specialist in High Availability Clustering",
        "description": "Validates ability to deploy and manage shared storage HA clusters with Pacemaker on RHEL.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex436-red-hat-certified-specialist-high-availability-clustering-exam",
        "track": "sysadmin",
        "performance_based": True,
    },
    {
        "id": "redhat-ex440",
        "code": "EX440",
        "name": "Red Hat Certified Specialist in Messaging Administration",
        "description": "Performance exam on installing, configuring, and managing Red Hat AMQ Broker for enterprise messaging.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 6,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex440-red-hat-certified-specialist-messaging-administration-exam",
        "track": "middleware",
        "performance_based": True,
    },
    {
        "id": "redhat-ex442",
        "code": "EX442",
        "name": "Red Hat Certified Specialist in Linux Performance Tuning",
        "description": "Validates ability to analyze, monitor, and tune the performance of RHEL systems for various workloads.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 5,
        "average_study_weeks": 10,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex442-red-hat-certified-specialist-linux-performance-tuning-exam",
        "track": "sysadmin",
        "performance_based": True,
    },
    {
        "id": "redhat-ex447",
        "code": "EX447",
        "name": "Red Hat Certified Specialist in Advanced Automation: Ansible Best Practices",
        "description": "Performance exam on advanced Ansible techniques — Jinja2 filters, custom modules, inventory plugins, AAP workflows.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 5,
        "average_study_weeks": 10,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex447-red-hat-certified-specialist-advanced-automation-ansible-best-practices-exam",
        "track": "ansible",
        "performance_based": True,
        "prerequisites": ["redhat-ex294"],
    },
    {
        "id": "redhat-ex457",
        "code": "EX457",
        "name": "Red Hat Certified Specialist in Ansible Network Automation",
        "description": "Validates ability to use Ansible to automate network device configuration across multiple vendors.",
        "total_questions": 0,
        "time_limit_minutes": 240,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 8,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex457-red-hat-certified-specialist-ansible-network-automation-exam",
        "track": "ansible",
        "performance_based": True,
        "prerequisites": ["redhat-ex294"],
    },
    {
        "id": "redhat-ex467",
        "code": "EX467",
        "name": "Red Hat Certified Specialist in Managing API Traffic with Red Hat 3scale API Management",
        "description": "Performance exam on installing, configuring, and managing the Red Hat 3scale API Management platform.",
        "total_questions": 0,
        "time_limit_minutes": 180,
        "passing_score_pct": 60,
        "difficulty_rating": 4,
        "average_study_weeks": 6,
        "cost_usd": 500,
        "validity_years": 3,
        "exam_url": "https://www.redhat.com/en/services/training/ex467-red-hat-certified-specialist-managing-api-traffic-red-hat-3scale-api-management-exam",
        "track": "middleware",
        "performance_based": True,
    },
]


# ── Generation ───────────────────────────────────────────────────────────


def slug_from_id(exam_id: str) -> str:
    """redhat-ex200 -> redhat-ex200 (already a slug)"""
    return exam_id


def make_exam_json(e: dict) -> dict:
    """Schema matches existing exam.json files."""
    domains = e.get("domains", [])
    return {
        "id": e["id"],
        "provider": "redhat",
        "name": e["name"],
        "code": e["code"],
        "description": e["description"],
        "total_questions": e["total_questions"],
        "time_limit_minutes": e["time_limit_minutes"],
        "passing_score_pct": e["passing_score_pct"],
        "domains": [
            {"id": did, "name": dname, "weight_pct": w}
            for did, dname, w in domains
        ] if domains else [
            {"id": "core-objectives", "name": "Core Exam Objectives", "weight_pct": 100}
        ],
        "exam_guide_url": e["exam_url"],
    }


def make_exam_info_json(e: dict) -> dict:
    """Schema matches existing exam_info.json files."""
    return {
        "exam_id": e["id"],
        "overview": (
            f"{e['name']} ({e['code']}) is a performance-based hands-on exam "
            f"administered by Red Hat. {e['description']}\n\n"
            "Unlike multiple-choice certifications, Red Hat exams are run on "
            "live RHEL/OpenShift systems — you complete real tasks against a "
            "graded environment within the time limit. There is no partial "
            "credit on most tasks: either the configuration works after a "
            "reboot or it doesn't."
        ),
        "difficulty_rating": e["difficulty_rating"],
        "average_study_weeks": e["average_study_weeks"],
        "cost_usd": e["cost_usd"],
        "validity_years": e["validity_years"],
        "recertification_info": (
            "Red Hat certifications are valid for 3 years. Recertify by passing "
            "the current version of this exam, an exam at the next level on "
            "the same track, or any qualifying exam in the Red Hat Certified "
            "Architect (RHCA) program."
        ),
        "official_resources": [
            {"title": "Official Exam Page", "url": e["exam_url"], "type": "exam_guide"},
            {"title": "Red Hat Learning Subscription", "url": "https://www.redhat.com/en/services/training/learning-subscription", "type": "training"},
            {"title": "Red Hat Documentation", "url": "https://access.redhat.com/documentation", "type": "docs"},
        ],
        "preparation_tips": [
            "Build a home lab — Red Hat exams test what you can do, not what you can recall. Spin up RHEL or OpenShift VMs and break things on purpose.",
            "Practice without the internet. The real exam is offline; if your muscle memory depends on Stack Overflow, you'll fail.",
            "Master man pages and `--help` flags for every command in your study notes.",
            "Reboot your practice systems often. Configurations must persist across reboots — graders reboot before scoring.",
            "Time-box every practice task to ~70% of the real exam allowance so you have buffer on test day.",
            "Read every task fully before touching the keyboard. Many candidates fail by misreading requirements.",
        ],
        "exam_day_tips": [
            "Allocate the first 5 minutes to skim every task and order them by speed-to-complete.",
            "Knock out the obvious wins first. Confidence early reduces panic on the hard ones.",
            "Verify each task by performing the exact action the grader will: ssh in fresh, reboot if needed, check the service status.",
            "Don't fixate on a single failing task — flag it, move on, return at the end.",
            "Use `tmux` if available to keep multiple panes for editing, testing, and tailing logs.",
        ],
    }


def write_if_changed(path: Path, data) -> bool:
    """Write JSON, return True if file changed (or didn't exist)."""
    payload = json.dumps(data, indent=2) + "\n"
    if path.exists() and path.read_text() == payload:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload)
    return True


def main():
    seed_root = Path(__file__).parent
    written = 0
    new_dirs = 0

    for e in REDHAT_EXAMS:
        slug = slug_from_id(e["id"])
        exam_dir = seed_root / slug
        is_new = not exam_dir.exists()

        # exam.json — overwrite
        if write_if_changed(exam_dir / "exam.json", make_exam_json(e)):
            written += 1

        # exam_info.json — overwrite
        if write_if_changed(exam_dir / "exam_info.json", make_exam_info_json(e)):
            written += 1

        # concepts.json — only create if missing (don't clobber existing content)
        if not (exam_dir / "concepts.json").exists():
            (exam_dir / "concepts.json").write_text("[]\n")
            written += 1

        # questions.json — only create if missing
        if not (exam_dir / "questions.json").exists():
            (exam_dir / "questions.json").write_text("[]\n")
            written += 1

        if is_new:
            new_dirs += 1

    print(f"✓ Wrote/updated {written} files across {len(REDHAT_EXAMS)} Red Hat exams")
    print(f"  ({new_dirs} new exam directories created)")
    print()
    print("Next steps:")
    print(f"  1. Review the generated dirs under {seed_root}/redhat-*/")
    print("  2. Seed into the database:")
    print("       python -m app.cli seed-all")
    print("     (or per-exam: python -m app.cli seed --exam redhat-ex200 --data-dir data/seed/redhat-ex200)")


if __name__ == "__main__":
    main()
