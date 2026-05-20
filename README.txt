Modificações necessárias

- Mudar nome de funcionarios para fornecedores

- Funções estaticas em fornecedores
    - Guia/Condutor
    - Motorista
        - Selecionar carro cadastrado
    - Hotel
        - Local
    - Outros

- Sessão de carro separada
    - Modelo
    - Placa
    - Local/Alugado
    - Descrição

- Sessão de cliente separada em duas subsessões
    - Cadastro cliente
        - Dados do cliente
            - Nome do cliente
            - Telefone
            - Email
            - Localidade
            - Numero de pessoas
            - Faixa etaria
            - Descrição      

    - Day by Day (Descrição dia a dia de um cliente)
        OBS.: Para um cliente tera a opção de cadastrar varias descrições dia a dia
            - Data
            - Guia (Opcional) -> Puxando da sessão Fornecedores
            - Carro (Opcional) -> Puxando da sessão Carro
            - Caixa de observação (Opcional)
            - Status
            - Descrição

- Sessão do sistema de emissão de voucher
    - Voucher
        - Logomarcar da empresa
        - Cadastur da empresar
        - Instagram
        - Site da empresa (Opcional)
        - Puxar dados de cadastro de cliente
        - Puxar dados de descrição do day by day