import supabase from "../supabaseClient.js"

async function testConnection() {

  console.log("Testando conexão com Supabase...\n")

  const { data, error } = await supabase
    .from("test_connection")
    .select("*")
    .limit(1)

  if (error) {

    console.error("❌ Falha na conexão")
    console.error(error.message)
    return

  }

  console.log("✅ Conexão estabelecida com sucesso")
  console.log("Dados retornados:", data)

}

testConnection()