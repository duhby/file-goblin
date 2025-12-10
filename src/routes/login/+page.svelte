<script lang="ts">
  import { authClient } from "$lib/client";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
</script>

<div class="login-container">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title>File Goblin</Card.Title>
      <Card.Description>asdf</Card.Description>
    </Card.Header>
    <Card.Footer class="flex-col gap-2">
      <Button
        onclick={async () => {
          await authClient.signIn.social({
            provider: "github",
          });
        }}
        class="w-full cursor-pointer">Sign in with GitHub</Button
      >
    </Card.Footer>
  </Card.Root>
</div>

<style>
  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
</style>
