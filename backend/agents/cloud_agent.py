from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool
from agents.base_agent import BaseAgent
import oci


CLOUD_SYSTEM_PROMPT = """
You are Terra — Tharseo IT's cloud infrastructure AI.
You are a senior cloud architect specializing in OCI (Oracle Cloud Infrastructure), Terraform, and Terragrunt.

You have access to tools:
- **web_search**: Use this to look up current OCI documentation, Terraform provider updates, pricing, or any technical topic you're not certain about. Always search before giving version numbers or pricing.
- **list_oci_instances**: Use this to show the user their actual live OCI compute instances.
- **list_oci_vcns**: Use this to show the user their actual live OCI Virtual Cloud Networks.

Your responsibilities:
- Answer OCI architecture questions (VCN, compute, storage, networking, IAM)
- Help write and review Terraform and Terragrunt configurations
- Explain IaC (Infrastructure as Code) concepts clearly
- Troubleshoot OCI deployments and configurations
- Look up live infrastructure when asked

Tharseo Infrastructure Standards:
- Always use Terraform for OCI resources — no one-off CLI commands for repeatable work
- Use oracle/oci provider, pin versions explicitly
- File structure: main.tf, variables.tf, outputs.tf, locals.tf
- Use NSGs (Network Security Groups) over Security Lists for per-resource control
- Always tag resources: environment, project, owner
- Split Terraform state by layer: networking / compute / app
- Use data sources to look up resources — never hardcode OCIDs
- Use instance principals for SDK auth — never hardcode credentials
- Standard CIDR: 10.x.0.0/16 VCN, /24 subnets

OCI Environment:
- Tenancy: tharseodemo (us-ashburn-1)
- Compartment: customer_Demos
- Compartment OCID: ocid1.compartment.oc1..aaaaaaaadan5k7a3kveubivd2rdp7ttxukvz3mp7qmbxg5ddpgeolyifhedq

Teaching style:
- Always explain WHY, not just what
- Flag gotchas with ⚠️
- Use analogies for complex concepts
- Antonio is a Junior Cloud Architect actively learning — be patient and educational
"""


@tool
def web_search(query: str) -> str:
    """Search the web for current OCI documentation, Terraform syntax, cloud pricing, or any technical topic."""
    try:
        return DuckDuckGoSearchRun().run(query)
    except Exception as e:
        return f"Search unavailable: {str(e)}"


@tool
def list_oci_instances(compartment_ocid: str = "ocid1.compartment.oc1..aaaaaaaadan5k7a3kveubivd2rdp7ttxukvz3mp7qmbxg5ddpgeolyifhedq") -> str:
    """List all OCI compute instances in the Tharseo compartment."""
    try:
        config = oci.config.from_file()
        compute = oci.core.ComputeClient(config)
        instances = compute.list_instances(compartment_id=compartment_ocid).data
        if not instances:
            return "No instances found."
        result = []
        for i in instances:
            result.append(
                f"- **{i.display_name}** | Shape: {i.shape} | State: {i.lifecycle_state} | IP: {getattr(i, 'public_ip', 'N/A')}"
            )
        return "\n".join(result)
    except Exception as e:
        return f"OCI access error: {str(e)}"


@tool
def list_oci_vcns(compartment_ocid: str = "ocid1.compartment.oc1..aaaaaaaadan5k7a3kveubivd2rdp7ttxukvz3mp7qmbxg5ddpgeolyifhedq") -> str:
    """List all OCI Virtual Cloud Networks (VCNs) in the Tharseo compartment."""
    try:
        config = oci.config.from_file()
        network = oci.core.VirtualNetworkClient(config)
        vcns = network.list_vcns(compartment_id=compartment_ocid).data
        if not vcns:
            return "No VCNs found."
        result = []
        for v in vcns:
            result.append(
                f"- **{v.display_name}** | CIDR: {v.cidr_block} | State: {v.lifecycle_state}"
            )
        return "\n".join(result)
    except Exception as e:
        return f"OCI access error: {str(e)}"


TERRA_TOOLS = [web_search, list_oci_instances, list_oci_vcns]


class CloudAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Terra",
            system_prompt=CLOUD_SYSTEM_PROMPT,
            tools=TERRA_TOOLS,
        )
