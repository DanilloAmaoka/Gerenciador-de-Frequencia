export const getInfoData = () => {
    const data = new Date();
    
    const diasDaSemana = [
        "Domingo", "Segunda-feira", "Terça-feira", 
        "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
    ];

    return {
        diaNumerico: data.getDate(),
        mes: data.getMonth() + 1,
        ano: data.getFullYear(),
        diaSemana: diasDaSemana[data.getDay()],
        dataFormatada: data.toLocaleDateString('pt-BR')
    };
};