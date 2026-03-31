import oci
from typing import Optional


COMPARTMENT_OCID = "ocid1.compartment.oc1..aaaaaaaadan5k7a3kveubivd2rdp7ttxukvz3mp7qmbxg5ddpgeolyifhedq"

QUERY_TRIGGERS = [
    "instance", "compute", "vm", "vcn", "network", "subnet",
    "running", "deployed", "resources", "infrastructure",
    "what do we have", "list", "show me", "bucket", "storage",
]


def _get_oci_auth() -> tuple:
    """
    Try instance principal (server), fall back to config file (local dev).
    Returns (signer_or_none, config_or_none).
    """
    try:
        signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
        return signer, None
    except Exception:
        pass
    try:
        config = oci.config.from_file()
        return None, config
    except Exception:
        return None, None


class OCIContextTool:
    """
    Fetches live OCI resource data and returns a formatted string for
    context injection into Terra's system prompt.

    Uses instance principal auth on the server, config file locally.
    Returns None if the message doesn't seem OCI-resource-related,
    or if auth is unavailable — non-fatal either way.
    """

    def _is_oci_query(self, message: str) -> bool:
        lower = message.lower()
        return any(t in lower for t in QUERY_TRIGGERS)

    def run(self, message: str) -> Optional[str]:
        if not self._is_oci_query(message):
            return None

        signer, config = _get_oci_auth()
        if signer is None and config is None:
            return None

        def make_client(cls):
            return cls({}, signer=signer) if signer else cls(config)

        lines = []

        try:
            compute = make_client(oci.core.ComputeClient)
            instances = compute.list_instances(COMPARTMENT_OCID).data
            if instances:
                lines.append("## Compute Instances")
                for inst in instances:
                    lines.append(
                        f"- {inst.display_name} | Shape: {inst.shape} "
                        f"| State: {inst.lifecycle_state}"
                    )
        except Exception as e:
            lines.append(f"## Compute Instances\n(query failed: {e})")

        try:
            network = make_client(oci.core.VirtualNetworkClient)
            vcns = network.list_vcns(COMPARTMENT_OCID).data
            if vcns:
                lines.append("\n## VCNs")
                for vcn in vcns:
                    lines.append(
                        f"- {vcn.display_name} | CIDR: {vcn.cidr_block} "
                        f"| State: {vcn.lifecycle_state}"
                    )
        except Exception as e:
            lines.append(f"\n## VCNs\n(query failed: {e})")

        return "\n".join(lines) if lines else None
