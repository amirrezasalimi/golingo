export default function getScriptCode(id: string) {
  return `<script src="${process.env.NEXT_PUBLIC_HOST_URL}script.js" defer></script>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.golingo != "undefined") {
            golingo.init({ code: '${id}' })
        }
    })
</script>`;
}
