import { db } from '../firebase/config';

import {
    collection,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    addDoc
} from 'firebase/firestore';

const obterNomeAlunoFalta = (falta) => {
    return typeof falta === 'object' ? falta.nome : falta;
};

const obterTipoFalta = (falta) => {
    return typeof falta === 'object' ? falta.tipo : 'regular';
};

const obterFaltasRegularesDaChamada = (chamada) => {
    const listaFaltas = chamada.faltas || [];

    return listaFaltas
        .filter(falta => obterTipoFalta(falta) !== 'justificada')
        .map(falta => obterNomeAlunoFalta(falta))
        .filter(Boolean);
};

const montarInfoDataChamada = (chamada) => {
    return {
        data: chamada.data,
        diaDaSemana: chamada.diaDaSemana || "",
    };
};

const calcularSequenciaAluno = (nomeAluno, chamadasOrdenadas) => {
    let quantidade = 0;
    let inicio = null;
    let fim = null;
    let datasSequencia = [];

    chamadasOrdenadas.forEach(chamada => {
        const nomesFaltantes = obterFaltasRegularesDaChamada(chamada);

        if (nomesFaltantes.includes(nomeAluno)) {
            if (quantidade === 0) {
                inicio = chamada.data;
                datasSequencia = [];
            }

            quantidade += 1;
            fim = chamada.data;

            datasSequencia.push({
                ...montarInfoDataChamada(chamada),
                alunos: [nomeAluno],
                quantidadeFaltasDia: 1
            });
        } else {
            quantidade = 0;
            inicio = null;
            fim = null;
            datasSequencia = [];
        }
    });

    return {
        quantidade,
        inicio,
        fim,
        datasSequencia
    };
};

const calcularSequenciaTurma = (chamadasOrdenadas) => {
    let quantidade = 0;
    let inicio = null;
    let fim = null;
    let datasSequencia = [];

    chamadasOrdenadas.forEach(chamada => {
        const nomesFaltantes = obterFaltasRegularesDaChamada(chamada);
        const turmaTeveFalta = nomesFaltantes.length > 0;

        if (turmaTeveFalta) {
            if (quantidade === 0) {
                inicio = chamada.data;
                datasSequencia = [];
            }

            quantidade += 1;
            fim = chamada.data;

            datasSequencia.push({
                ...montarInfoDataChamada(chamada),
                alunos: nomesFaltantes,
                quantidadeFaltasDia: nomesFaltantes.length
            });
        } else {
            quantidade = 0;
            inicio = null;
            fim = null;
            datasSequencia = [];
        }
    });

    return {
        quantidade,
        inicio,
        fim,
        datasSequencia
    };
};

const obterFaltasAlunoPorPeriodo = ({
    nomeAluno,
    chamadasOrdenadas,
    tipoPeriodo,
    mesReferencia,
    anoReferencia
}) => {
    return chamadasOrdenadas
        .filter(chamada => {
            if (!chamada.data) return false;

            if (tipoPeriodo === "Mensal") {
                return chamada.data.startsWith(mesReferencia);
            }

            if (tipoPeriodo === "Anual") {
                return chamada.data.startsWith(anoReferencia);
            }

            return false;
        })
        .filter(chamada => {
            const nomesFaltantes = obterFaltasRegularesDaChamada(chamada);
            return nomesFaltantes.includes(nomeAluno);
        })
        .map(chamada => ({
            ...montarInfoDataChamada(chamada),
            alunos: [nomeAluno],
            quantidadeFaltasDia: 1
        }));
};

const obterFaltasTurmaPorPeriodo = ({
    chamadasOrdenadas,
    tipoPeriodo,
    mesReferencia,
    anoReferencia
}) => {
    return chamadasOrdenadas
        .filter(chamada => {
            if (!chamada.data) return false;

            if (tipoPeriodo === "Mensal") {
                return chamada.data.startsWith(mesReferencia);
            }

            if (tipoPeriodo === "Anual") {
                return chamada.data.startsWith(anoReferencia);
            }

            return false;
        })
        .map(chamada => {
            const nomesFaltantes = obterFaltasRegularesDaChamada(chamada);

            return {
                ...montarInfoDataChamada(chamada),
                alunos: nomesFaltantes,
                quantidadeFaltasDia: nomesFaltantes.length
            };
        })
        .filter(item => item.quantidadeFaltasDia > 0);
};

const gerarDescricaoProximoAviso = ({
    tipoPeriodo,
    periodoReferencia,
    quantidadeFaltasAtual
}) => {
    if (tipoPeriodo === "Mensal") {
        const mesAno = periodoReferencia.replace("mensal:", "");

        return `Este alerta foi registrado para o mês ${mesAno}. Depois de visto, ele só avisará novamente neste mesmo mês se a quantidade ultrapassar ${quantidadeFaltasAtual} falta(s).`;
    }

    if (tipoPeriodo === "Anual") {
        const ano = periodoReferencia.replace("anual:", "");

        return `Este alerta foi registrado para o ano ${ano}. Depois de visto, ele só avisará novamente neste mesmo ano se a quantidade ultrapassar ${quantidadeFaltasAtual} falta(s).`;
    }

    if (tipoPeriodo === "Seguidas") {
        return `Este alerta foi registrado para a sequência atual. Depois de visto, ele só avisará novamente se essa mesma sequência ultrapassar ${quantidadeFaltasAtual} falta(s), ou se uma nova sequência atingir o limite novamente.`;
    }

    return "Depois de visto, o sistema só avisará novamente se houver novo aumento relevante nas faltas.";
};

const registrarOuAtualizarAlerta = async ({
    idRegra,
    textoRegra,
    textoNotificacao,
    causador,
    turma,
    quantidadeFaltasAtual,
    periodoReferencia,
    faltasConsideradas = [],
    tipoPeriodo,
    tipoAlvo,
    limiteRegra
}) => {
    const alertasRef = collection(db, "alertas_disparados");

    const qExistente = query(
        alertasRef,
        where("id_regra", "==", idRegra),
        where("causador", "==", causador)
    );

    const snapExistente = await getDocs(qExistente);

    const ocorrenciasMesmoPeriodo = snapExistente.docs
        .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }))
        .filter(item => item.periodoReferencia === periodoReferencia);

    const ocorrenciaAberta = ocorrenciasMesmoPeriodo.find(item => item.lido === false);

    const descricaoProximoAviso = gerarDescricaoProximoAviso({
        tipoPeriodo,
        periodoReferencia,
        quantidadeFaltasAtual
    });

    if (ocorrenciaAberta) {
        const quantidadeAnterior = ocorrenciaAberta.quantidadeFaltasAtual || 0;

        if (quantidadeFaltasAtual > quantidadeAnterior) {
            await updateDoc(doc(db, "alertas_disparados", ocorrenciaAberta.id), {
                texto_notificacao: textoNotificacao,
                textoRegra,
                quantidadeFaltasAtual,
                faltasConsideradas,
                tipoPeriodo,
                tipoAlvo,
                limiteRegra,
                descricaoProximoAviso,
                dataAtualizacao: new Date().toISOString()
            });
        }

        return;
    }

    const maiorQuantidadeJaRegistrada = ocorrenciasMesmoPeriodo.reduce((maior, item) => {
        const qtd = item.quantidadeFaltasAtual || 0;
        return qtd > maior ? qtd : maior;
    }, 0);

    if (quantidadeFaltasAtual <= maiorQuantidadeJaRegistrada) {
        return;
    }

    await addDoc(alertasRef, {
        id_regra: idRegra,
        textoRegra,
        texto_notificacao: textoNotificacao,
        causador,
        turma,
        quantidadeFaltasAtual,
        periodoReferencia,
        faltasConsideradas,
        tipoPeriodo,
        tipoAlvo,
        limiteRegra,
        descricaoProximoAviso,
        lido: false,
        dataDisparo: new Date().toISOString()
    });
};

export const executarMotorAlertasDaTurma = async ({
    idTurma,
    nomeTurma,
    alunos = [],
    dataReferencia = new Date().toISOString().split('T')[0]
}) => {
    const alertasConfigRef = collection(db, "config_alertas");

    const qAlertas = query(
        alertasConfigRef,
        where("ativo", "==", true)
    );

    const alertasSnapshot = await getDocs(qAlertas);

    if (alertasSnapshot.empty) {
        return;
    }

    const chamadasRef = collection(db, "turmas", idTurma, "chamadas");
    const chamadasSnapshot = await getDocs(chamadasRef);

    const chamadasOrdenadas = chamadasSnapshot.docs
        .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }))
        .filter(chamada => chamada.data)
        .sort((a, b) => a.data.localeCompare(b.data));

    const mesReferencia = dataReferencia.substring(0, 7);
    const anoReferencia = dataReferencia.substring(0, 4);

    const metricasPorAluno = {};
    let totalMensalTurma = 0;
    let totalAnualTurma = 0;

    alunos.forEach(nomeAluno => {
        metricasPorAluno[nomeAluno] = {
            mensal: 0,
            anual: 0,
            seguidas: 0,
            inicioSequencia: null,
            fimSequencia: null,
            datasSequencia: []
        };
    });

    chamadasOrdenadas.forEach(chamada => {
        const nomesFaltantes = obterFaltasRegularesDaChamada(chamada);

        nomesFaltantes.forEach(nomeAluno => {
            if (!metricasPorAluno[nomeAluno]) {
                metricasPorAluno[nomeAluno] = {
                    mensal: 0,
                    anual: 0,
                    seguidas: 0,
                    inicioSequencia: null,
                    fimSequencia: null,
                    datasSequencia: []
                };
            }

            if (chamada.data.startsWith(mesReferencia)) {
                metricasPorAluno[nomeAluno].mensal += 1;
                totalMensalTurma += 1;
            }

            if (chamada.data.startsWith(anoReferencia)) {
                metricasPorAluno[nomeAluno].anual += 1;
                totalAnualTurma += 1;
            }
        });
    });

    Object.keys(metricasPorAluno).forEach(nomeAluno => {
        const sequencia = calcularSequenciaAluno(nomeAluno, chamadasOrdenadas);

        metricasPorAluno[nomeAluno].seguidas = sequencia.quantidade;
        metricasPorAluno[nomeAluno].inicioSequencia = sequencia.inicio;
        metricasPorAluno[nomeAluno].fimSequencia = sequencia.fim;
        metricasPorAluno[nomeAluno].datasSequencia = sequencia.datasSequencia;
    });

    const sequenciaTurma = calcularSequenciaTurma(chamadasOrdenadas);

    for (const docRegra of alertasSnapshot.docs) {
        const regra = docRegra.data();
        const idRegra = docRegra.id;
        const limite = Number(regra.quantidadeFaltas);
        const periodo = regra.tipoPeriodo;

        if (!limite || limite < 1) {
            continue;
        }

        if (regra.tipoAlvo === "Turma") {
            const correspondeAoEscopo =
                regra.escopo === "Todos" ||
                (
                    regra.escopo === "Especifico" &&
                    regra.turmaAlvo === nomeTurma
                );

            if (!correspondeAoEscopo) {
                continue;
            }

            let totalRegistrado = 0;
            let periodoReferencia = "";
            let textoNotificacao = "";
            let faltasConsideradas = [];

            if (periodo === "Mensal") {
                totalRegistrado = totalMensalTurma;
                periodoReferencia = `mensal:${mesReferencia}`;
                textoNotificacao = `A turma atingiu o limite de faltas mensais!`;

                faltasConsideradas = obterFaltasTurmaPorPeriodo({
                    chamadasOrdenadas,
                    tipoPeriodo: periodo,
                    mesReferencia,
                    anoReferencia
                });
            }

            if (periodo === "Anual") {
                totalRegistrado = totalAnualTurma;
                periodoReferencia = `anual:${anoReferencia}`;
                textoNotificacao = `A turma atingiu o limite de faltas anuais!`;

                faltasConsideradas = obterFaltasTurmaPorPeriodo({
                    chamadasOrdenadas,
                    tipoPeriodo: periodo,
                    mesReferencia,
                    anoReferencia
                });
            }

            if (periodo === "Seguidas") {
                totalRegistrado = sequenciaTurma.quantidade;
                periodoReferencia = `seguidas:${sequenciaTurma.inicio || "sem-sequencia"}`;
                textoNotificacao = `A turma atingiu o limite de chamadas seguidas com faltas!`;
                faltasConsideradas = sequenciaTurma.datasSequencia;
            }

            if (totalRegistrado >= limite) {
                await registrarOuAtualizarAlerta({
                    idRegra,
                    textoRegra: regra.texto || "",
                    textoNotificacao,
                    causador: nomeTurma,
                    turma: nomeTurma,
                    quantidadeFaltasAtual: totalRegistrado,
                    periodoReferencia,
                    faltasConsideradas,
                    tipoPeriodo: periodo,
                    tipoAlvo: regra.tipoAlvo,
                    limiteRegra: limite
                });
            }
        }

        if (regra.tipoAlvo === "Aluno") {
            for (const nomeAluno of Object.keys(metricasPorAluno)) {
                const metricas = metricasPorAluno[nomeAluno];

                const correspondeAoEscopo =
                    regra.escopo === "Todos" ||
                    (
                        regra.escopo === "Especifico" &&
                        regra.turmaAlvo === nomeTurma &&
                        regra.alunoAlvo === nomeAluno
                    );

                if (!correspondeAoEscopo) {
                    continue;
                }

                let totalRegistrado = 0;
                let periodoReferencia = "";
                let textoNotificacao = "";
                let faltasConsideradas = [];

                if (periodo === "Mensal") {
                    totalRegistrado = metricas.mensal;
                    periodoReferencia = `mensal:${mesReferencia}`;
                    textoNotificacao = `Limite de faltas mensais atingido!`;

                    faltasConsideradas = obterFaltasAlunoPorPeriodo({
                        nomeAluno,
                        chamadasOrdenadas,
                        tipoPeriodo: periodo,
                        mesReferencia,
                        anoReferencia
                    });
                }

                if (periodo === "Anual") {
                    totalRegistrado = metricas.anual;
                    periodoReferencia = `anual:${anoReferencia}`;
                    textoNotificacao = `Limite de faltas anuais atingido!`;

                    faltasConsideradas = obterFaltasAlunoPorPeriodo({
                        nomeAluno,
                        chamadasOrdenadas,
                        tipoPeriodo: periodo,
                        mesReferencia,
                        anoReferencia
                    });
                }

                if (periodo === "Seguidas") {
                    totalRegistrado = metricas.seguidas;
                    periodoReferencia = `seguidas:${metricas.inicioSequencia || "sem-sequencia"}`;
                    textoNotificacao = `Limite de faltas seguidas atingido!`;
                    faltasConsideradas = metricas.datasSequencia;
                }

                if (totalRegistrado >= limite) {
                    await registrarOuAtualizarAlerta({
                        idRegra,
                        textoRegra: regra.texto || "",
                        textoNotificacao,
                        causador: nomeAluno,
                        turma: nomeTurma,
                        quantidadeFaltasAtual: totalRegistrado,
                        periodoReferencia,
                        faltasConsideradas,
                        tipoPeriodo: periodo,
                        tipoAlvo: regra.tipoAlvo,
                        limiteRegra: limite
                    });
                }
            }
        }
    }
};

export const executarMotorAlertasGeral = async ({
    dataReferencia = new Date().toISOString().split('T')[0]
} = {}) => {
    const turmasSnapshot = await getDocs(collection(db, "turmas"));

    for (const turmaDoc of turmasSnapshot.docs) {
        const dadosTurma = turmaDoc.data();

        if (!dadosTurma.nome) {
            continue;
        }

        await executarMotorAlertasDaTurma({
            idTurma: turmaDoc.id,
            nomeTurma: dadosTurma.nome,
            alunos: dadosTurma.alunos || [],
            dataReferencia
        });
    }
};